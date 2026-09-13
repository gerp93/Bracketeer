import type { HouseholdInput, YearPlanInput } from './projectionTypes';
import { runProjection } from './projection';
import { headroomToNextBracket, headroomInStack, taxOnStackedAmount } from './bracketMath';
import { headroomToNextIrmaaTier } from './irmaa';
import { FEDERAL_TAX_TABLES_2025, projectTaxYearTables } from './data/federalTaxTables';
import {
  MN_SS_SUBTRACTION_PHASEOUT_START_2025,
  MN_STANDARD_DEDUCTION_PHASEOUT_START_2025,
} from './data/minnesotaTaxTables';

const DEFAULT_DELTA = 1_000;

export interface MarginalRateBreakdown {
  year: number;
  deltaAmount: number;
  /** Each component's share of the added tax, in dollars — these sum exactly to totalCost by construction (see marginalRate.ts's decomposition notes). */
  federalBracketComponent: number;
  socialSecurityTaxabilityComponent: number;
  capitalGainsStackingComponent: number;
  niitComponent: number;
  stateComponent: number;
  /** IRMAA cost landing two years later, attributable to this year's added conversion — $0 if that year is beyond the projection horizon. */
  irmaaComponent: number;
  totalCost: number;
  /** totalCost / deltaAmount — the true marginal rate on the next converted dollar, decomposed above. */
  trueMarginalRate: number;
}

export interface HeadroomMarkers {
  year: number;
  /** Dollars of additional conversion before crossing into the next federal ordinary bracket. Undefined if already in the top bracket. */
  toNextFederalBracket?: number;
  /** Dollars of additional conversion before capital gains stacked on top get pushed out of the 0% LTCG bracket. Undefined if not currently in the 0% bracket, or there are no gains to push. */
  toTopOfZeroPercentLtcg?: number;
  /** Dollars of additional conversion before the IRMAA tier that will apply two years from now changes. Undefined if already in the top tier. */
  toNextIrmaaTier?: number;
  /** Minnesota only: dollars before the SS subtraction phase-out begins, or before the MN standard deduction phase-down begins — whichever is closer and not yet started. Undefined if not applicable (not MN, no SS, or already past both). */
  toMnPhaseoutStart?: number;
}

/**
 * Computes the true marginal cost of the next converted dollar for
 * `targetYear`, by finite difference on the REAL projection engine —
 * running it once at the plan's conversion amount and once with
 * `deltaAmount` more in that single year, then decomposing the difference
 * in outcomes. Deliberately NOT a second, hand-derived rate formula: that
 * would drift from the engine's actual behavior as the engine evolves.
 * See BRACKETEER_BUILD_PLAN.md Phase 4.
 */
export function computeMarginalRateBreakdown(
  household: HouseholdInput,
  yearPlans: YearPlanInput[],
  targetYear: number,
  deltaAmount: number = DEFAULT_DELTA
): MarginalRateBreakdown {
  const baseline = runProjection(household, yearPlans);
  const bumpedPlans = yearPlans.map((p) =>
    p.year === targetYear ? { ...p, conversionAmount: p.conversionAmount + deltaAmount } : p
  );
  const bumped = runProjection(household, bumpedPlans);

  const baseYear = baseline.years.find((y) => y.year === targetYear);
  const bumpedYear = bumped.years.find((y) => y.year === targetYear);
  if (!baseYear || !bumpedYear) {
    throw new Error(`computeMarginalRateBreakdown: targetYear ${targetYear} is not in the projection horizon`);
  }

  const f0 = baseYear.federalResult;
  const f1 = bumpedYear.federalResult;

  // Decompose the ordinary-tax delta into a bracket component (the raw
  // conversion income itself) and an SS-taxability component (the extra
  // Social Security dragged into taxability by that income), via the same
  // telescoping-stack technique bracketMath.ts uses for LTCG: the two
  // components sum EXACTLY to the ordinary tax delta because
  // taxOnAmount(a+b+c) - taxOnAmount(a) telescopes through taxOnAmount(a+b).
  const deltaOrdinaryBeforeSS = f1.ordinaryIncomeBeforeSS - f0.ordinaryIncomeBeforeSS;
  const deltaTaxableSS = f1.taxableSocialSecurity - f0.taxableSocialSecurity;
  const tables = resolveTablesForYear(household, targetYear);
  const ordinaryBrackets = tables.ordinaryBrackets[baseYear.filingStatus];
  const federalBracketComponent = taxOnStackedAmount(f0.ordinaryTaxableIncome, deltaOrdinaryBeforeSS, ordinaryBrackets);
  const socialSecurityTaxabilityComponent = taxOnStackedAmount(
    f0.ordinaryTaxableIncome + deltaOrdinaryBeforeSS,
    deltaTaxableSS,
    ordinaryBrackets
  );

  const capitalGainsStackingComponent = f1.taxOnCapitalGains - f0.taxOnCapitalGains;
  const niitComponent = f1.niit - f0.niit;
  const stateComponent = bumpedYear.stateResult.stateTax - baseYear.stateResult.stateTax;

  const irmaaYear = bumped.years.find((y) => y.year === targetYear + 2);
  const irmaaYearBase = baseline.years.find((y) => y.year === targetYear + 2);
  const irmaaComponent =
    irmaaYear && irmaaYearBase
      ? irmaaYear.irmaaResult.annualSurchargeTotal - irmaaYearBase.irmaaResult.annualSurchargeTotal
      : 0;

  const totalCost =
    federalBracketComponent +
    socialSecurityTaxabilityComponent +
    capitalGainsStackingComponent +
    niitComponent +
    stateComponent +
    irmaaComponent;

  return {
    year: targetYear,
    deltaAmount,
    federalBracketComponent,
    socialSecurityTaxabilityComponent,
    capitalGainsStackingComponent,
    niitComponent,
    stateComponent,
    irmaaComponent,
    totalCost,
    trueMarginalRate: deltaAmount > 0 ? totalCost / deltaAmount : 0,
  };
}

/** Passive landmarks for the target year — where the walls are, not what to do about them. */
export function computeHeadroomMarkers(household: HouseholdInput, yearPlans: YearPlanInput[], targetYear: number): HeadroomMarkers {
  const summary = runProjection(household, yearPlans);
  const yearResult = summary.years.find((y) => y.year === targetYear);
  if (!yearResult) {
    throw new Error(`computeHeadroomMarkers: targetYear ${targetYear} is not in the projection horizon`);
  }

  const tables = resolveTablesForYear(household, targetYear);
  const ordinaryBrackets = tables.ordinaryBrackets[yearResult.filingStatus];
  const ltcgBrackets = tables.ltcgBrackets[yearResult.filingStatus];
  const f = yearResult.federalResult;

  const toNextFederalBracket = headroomToNextBracket(f.ordinaryTaxableIncome, ordinaryBrackets);

  let toTopOfZeroPercentLtcg: number | undefined;
  if (f.gainsTaxableIncome > 0) {
    const zeroBracketTop = ltcgBrackets.find((b) => b.rate === 0)?.to;
    if (zeroBracketTop !== undefined && f.ordinaryTaxableIncome < zeroBracketTop) {
      toTopOfZeroPercentLtcg = headroomInStack(f.ordinaryTaxableIncome, 0, ltcgBrackets);
    }
  }

  const toNextIrmaaTier = headroomToNextIrmaaTier(yearResult.magi, yearResult.filingStatus, tables);

  let toMnPhaseoutStart: number | undefined;
  if (household.stateCode.toUpperCase() === 'MN') {
    const ssStart = MN_SS_SUBTRACTION_PHASEOUT_START_2025[yearResult.filingStatus];
    const stdStart = MN_STANDARD_DEDUCTION_PHASEOUT_START_2025[yearResult.filingStatus];
    const agi = f.adjustedGrossIncome;
    const candidates = [ssStart - agi, stdStart - agi].filter((h) => h > 0);
    if (candidates.length > 0) toMnPhaseoutStart = Math.min(...candidates);
  }

  return { year: targetYear, toNextFederalBracket, toTopOfZeroPercentLtcg, toNextIrmaaTier, toMnPhaseoutStart };
}

function resolveTablesForYear(household: HouseholdInput, year: number) {
  if (year === FEDERAL_TAX_TABLES_2025.year) return FEDERAL_TAX_TABLES_2025;
  if (year > FEDERAL_TAX_TABLES_2025.year) {
    return projectTaxYearTables(FEDERAL_TAX_TABLES_2025, year, household.generalInflationAssumption);
  }
  return FEDERAL_TAX_TABLES_2025;
}
