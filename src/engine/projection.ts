import type { FilingStatus } from './types';
import type {
  AccountBalances,
  HouseholdInput,
  ProjectionSummary,
  ProjectionYearResult,
  YearPlanInput,
} from './projectionTypes';
import { computeFederalTax } from './federalTax';
import { FEDERAL_TAX_TABLES_2025, projectTaxYearTables } from './data/federalTaxTables';
import { resolveStateTaxModule } from './states';
import { computeIrmaa } from './irmaa';
import { computeRmd } from './rmd';
import { householdSocialSecurityBenefit } from './socialSecurityBenefit';

const FEDERAL_BASE_YEAR = FEDERAL_TAX_TABLES_2025.year;

/**
 * Runs the year-by-year projection. See BRACKETEER_BUILD_PLAN.md Phase 3.
 *
 * Two deliberate v1 simplifications, both noted here rather than hidden:
 *   1. Household accounts are modeled as one combined traditional/Roth/
 *      taxable balance rather than per-spouse-owned accounts. RMDs use the
 *      OLDER living spouse's age/birth year against the combined
 *      traditional balance — a simplification, not the literal per-account
 *      IRS rule, but directionally conservative (starts RMDs at the
 *      earliest correct point).
 *   2. Funding the year's spending + tax need from the taxable account is
 *      resolved with a two-pass approximation rather than an exact fixed
 *      point: pass 1 estimates tax assuming only discretionary gains; pass
 *      2 computes the actual withdrawal-driven gains from that estimate
 *      and recomputes tax once more. Close enough for a planning tool, but
 *      not exact to the dollar in an extreme edge case.
 *
 * `priorMagiHistory` supplies MAGI for (startYear - 2) and (startYear - 1)
 * so year 1 and 2's IRMAA lookback has something real to read; omitted
 * years are treated as $0 MAGI (no IRMAA surcharge in early projection years).
 */
export function runProjection(
  household: HouseholdInput,
  yearPlans: YearPlanInput[],
  priorMagiHistory: Record<number, number> = {}
): ProjectionSummary {
  const magiHistory: Record<number, number> = { ...priorMagiHistory };
  const years: ProjectionYearResult[] = [];

  let balances: AccountBalances = { ...household.startingBalances };
  let lifetimeTaxPaid = 0;

  const sortedPlans = [...yearPlans].sort((a, b) => a.year - b.year);

  for (const plan of sortedPlans) {
    const { year } = plan;
    const spouseA = household.spouses[0];
    const spouseB = household.spouses[1];

    const aliveA = spouseA.assumedDeathYear === undefined || year <= spouseA.assumedDeathYear;
    const aliveB = spouseB.assumedDeathYear === undefined || year <= spouseB.assumedDeathYear;
    if (!aliveA && !aliveB) break; // household extinct — nothing left to project

    const filingStatus: FilingStatus = aliveA && aliveB ? 'mfj' : 'single';
    const wasAliveBothLastYear =
      (spouseA.assumedDeathYear === undefined || year - 1 <= spouseA.assumedDeathYear) &&
      (spouseB.assumedDeathYear === undefined || year - 1 <= spouseB.assumedDeathYear);
    const isWidowPenaltyYear = filingStatus === 'single' && wasAliveBothLastYear;

    const ageA = year - spouseA.birthYear;
    const ageB = year - spouseB.birthYear;
    const livingAges = [aliveA ? ageA : undefined, aliveB ? ageB : undefined].filter(
      (a): a is number => a !== undefined
    );
    const age65PlusCount = Math.min(livingAges.length, livingAges.filter((a) => a >= 65).length) as 0 | 1 | 2;

    // RMD driven by the older living spouse's age (simplification, see docstring above).
    const olderLivingBirthYear = aliveA && aliveB
      ? Math.min(spouseA.birthYear, spouseB.birthYear)
      : aliveA
        ? spouseA.birthYear
        : spouseB.birthYear;
    const olderLivingAge = year - olderLivingBirthYear;

    const tables = year === FEDERAL_BASE_YEAR
      ? FEDERAL_TAX_TABLES_2025
      : year > FEDERAL_BASE_YEAR
        ? projectTaxYearTables(FEDERAL_TAX_TABLES_2025, year, household.generalInflationAssumption)
        : FEDERAL_TAX_TABLES_2025;

    const startingBalancesThisYear = { ...balances };

    const rmdAmount = computeRmd(startingBalancesThisYear.traditional, olderLivingAge, olderLivingBirthYear, tables);
    const conversionAmount = Math.min(
      plan.conversionAmount,
      Math.max(0, startingBalancesThisYear.traditional - rmdAmount)
    );

    const ssBenefits = householdSocialSecurityBenefit(
      household.spouses,
      year,
      household.startYear,
      household.generalInflationAssumption
    );

    const proRataNonTaxableFraction =
      startingBalancesThisYear.traditional > 0
        ? Math.min(1, startingBalancesThisYear.traditionalBasis / startingBalancesThisYear.traditional)
        : 0;

    const stateModule = resolveStateTaxModule(household.stateCode, household.flatRateStateFallbackRate);

    // --- Pass 1: estimate tax assuming only discretionary gains, to size the cash need. ---
    const pass1 = computeYearTax(
      tables,
      stateModule,
      filingStatus,
      age65PlusCount,
      plan.wages + plan.pension + plan.otherOrdinaryIncome + rmdAmount,
      conversionAmount,
      plan.discretionaryCapitalGains,
      ssBenefits,
      proRataNonTaxableFraction,
      year
    );

    const cashFromOrdinarySources = plan.wages + plan.pension + plan.otherOrdinaryIncome + rmdAmount + ssBenefits;
    const cashNeed = plan.targetSpending + pass1.federalResult.totalFederalTax + pass1.stateResult.stateTax;
    const shortfall = Math.max(0, cashNeed - cashFromOrdinarySources);
    const withdrawal = Math.min(shortfall, startingBalancesThisYear.taxable);
    const taxableGainFraction =
      startingBalancesThisYear.taxable > 0
        ? Math.max(
            0,
            1 - startingBalancesThisYear.taxableCostBasis / startingBalancesThisYear.taxable
          )
        : 0;
    const gainFromWithdrawal = withdrawal * taxableGainFraction;
    const totalCapitalGains = plan.discretionaryCapitalGains + gainFromWithdrawal;

    // --- Pass 2: recompute with the real capital gains figure. ---
    const pass2 = computeYearTax(
      tables,
      stateModule,
      filingStatus,
      age65PlusCount,
      plan.wages + plan.pension + plan.otherOrdinaryIncome + rmdAmount,
      conversionAmount,
      totalCapitalGains,
      ssBenefits,
      proRataNonTaxableFraction,
      year
    );

    const irmaaMagi = magiHistory[year - 2] ?? 0;
    const coveredPersonCount = filingStatus === 'mfj' ? 2 : 1;
    const irmaaResult = computeIrmaa(irmaaMagi, filingStatus, tables, coveredPersonCount);

    const totalTax = pass2.federalResult.totalFederalTax + pass2.stateResult.stateTax + irmaaResult.annualSurchargeTotal;
    const effectiveRate =
      pass2.federalResult.adjustedGrossIncome > 0 ? totalTax / pass2.federalResult.adjustedGrossIncome : 0;

    magiHistory[year] = pass2.federalResult.adjustedGrossIncome;
    lifetimeTaxPaid += totalTax;

    // --- Roll balances forward. ---
    const traditionalBasisConsumed = proRataNonTaxableFraction * conversionAmount;
    const nextTraditional = startingBalancesThisYear.traditional - rmdAmount - conversionAmount;
    const nextTraditionalBasis = Math.max(0, startingBalancesThisYear.traditionalBasis - traditionalBasisConsumed);
    const nextRoth = startingBalancesThisYear.roth + conversionAmount;
    const nextTaxable = startingBalancesThisYear.taxable - withdrawal;
    const taxableBasisConsumed =
      startingBalancesThisYear.taxable > 0
        ? withdrawal * (startingBalancesThisYear.taxableCostBasis / startingBalancesThisYear.taxable)
        : 0;
    const nextTaxableBasis = Math.max(0, startingBalancesThisYear.taxableCostBasis - taxableBasisConsumed);

    const growth = 1 + plan.returnAssumption;
    const endingBalances: AccountBalances = {
      traditional: Math.max(0, nextTraditional) * growth,
      traditionalBasis: nextTraditionalBasis,
      roth: Math.max(0, nextRoth) * growth,
      taxable: Math.max(0, nextTaxable) * growth,
      taxableCostBasis: nextTaxableBasis,
    };

    years.push({
      year,
      ages: [ageA, ageB],
      filingStatus,
      isWidowPenaltyYear,
      startingBalances: startingBalancesThisYear,
      rmdAmount,
      conversionAmount,
      socialSecurityBenefits: ssBenefits,
      capitalGainsRealized: totalCapitalGains,
      federalResult: pass2.federalResult,
      stateResult: pass2.stateResult,
      irmaaResult,
      totalTax,
      effectiveRate,
      endingBalances,
      magi: pass2.federalResult.adjustedGrossIncome,
    });

    balances = endingBalances;
  }

  const terminalBalances = balances;
  // The headline comparison metric: the traditional balance is haircut by
  // the assumed heir marginal rate (it's not real spendable money until
  // someone pays ordinary tax on it — under SECURE Act 10-year-rule timing
  // for an inherited IRA, typically the heir's own bracket), while Roth
  // and taxable balances count at face value.
  const terminalAfterTaxWealth =
    terminalBalances.traditional * (1 - household.assumedHeirMarginalRate) +
    terminalBalances.roth +
    terminalBalances.taxable;

  return { years, lifetimeTaxPaid, terminalBalances, terminalAfterTaxWealth };
}

function computeYearTax(
  tables: ReturnType<typeof projectTaxYearTables> | typeof FEDERAL_TAX_TABLES_2025,
  stateModule: ReturnType<typeof resolveStateTaxModule>,
  filingStatus: FilingStatus,
  age65PlusCount: 0 | 1 | 2,
  otherOrdinaryIncome: number,
  conversionAmount: number,
  capitalGains: number,
  ssBenefits: number,
  proRataNonTaxableFraction: number,
  year: number
) {
  const federalResult = computeFederalTax(tables, {
    filingStatus,
    age65PlusCount,
    otherOrdinaryIncome,
    conversionAmount,
    capitalGains,
    socialSecurityBenefits: ssBenefits,
    proRataNonTaxableFraction,
  });

  const stateResult = stateModule.computeStateTax({
    federalAgi: federalResult.adjustedGrossIncome,
    federalTaxableIncome: federalResult.taxableIncome,
    ordinaryIncome: federalResult.totalOrdinaryIncome,
    capitalGains,
    socialSecurityBenefits: ssBenefits,
    filingStatus,
    year,
  });

  return { federalResult, stateResult };
}
