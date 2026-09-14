import type { FilingStatus } from './types';
import type {
  AccountBalances,
  HouseholdInput,
  ProjectionSummary,
  ProjectionYearResult,
  SocialSecurityDetail,
  YearPlanInput,
} from './projectionTypes';
import { computeFederalTax } from './federalTax';
import { FEDERAL_TAX_TABLES_2025, projectTaxYearTables } from './data/federalTaxTables';
import { resolveStateTaxModule } from './states';
import { computeIrmaa } from './irmaa';
import { computeRmd } from './rmd';
import { householdSocialSecurityBenefit, spouseAnnualBenefit, claimingAdjustmentFactor } from './socialSecurityBenefit';

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
 * `household.priorMagiHistory` supplies actual MAGI for (startYear - 2) and
 * (startYear - 1) so year 1 and 2's IRMAA lookback has something real to
 * read, rather than assuming $0 income (and therefore no surcharge) in the
 * first two projected years.
 */
export function runProjection(household: HouseholdInput, yearPlans: YearPlanInput[]): ProjectionSummary {
  const magiHistory: Record<number, number> = {
    [household.startYear - 2]: household.priorMagiHistory.twoYearsBefore,
    [household.startYear - 1]: household.priorMagiHistory.oneYearBefore,
  };
  const years: ProjectionYearResult[] = [];

  let balances: AccountBalances = { ...household.startingBalances };
  let lifetimeTaxPaid = 0;

  const sortedPlans = [...yearPlans].sort((a, b) => a.year - b.year);

  const [spouseA, spouseB] = resolveEffectiveSpouses(household);

  for (const plan of sortedPlans) {
    const { year } = plan;

    const aliveA = spouseA.assumedDeathYear === undefined || year <= spouseA.assumedDeathYear;
    const aliveB = spouseB.assumedDeathYear === undefined || year <= spouseB.assumedDeathYear;
    if (!aliveA && !aliveB) break; // household extinct — nothing left to project

    const filingStatus: FilingStatus = aliveA && aliveB ? household.householdType : 'single';
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
    // Conversion is resolved first (unchanged from before this field
    // existed), so a voluntary withdrawal only gets whatever's left after
    // RMD + Conversion have already claimed their share of Traditional.
    const traditionalWithdrawal = Math.min(
      plan.traditionalWithdrawal,
      Math.max(0, startingBalancesThisYear.traditional - rmdAmount - conversionAmount)
    );
    // Capped at the Roth balance at the START of the year — this year's own
    // conversion isn't treated as available to withdraw right back out.
    const rothWithdrawal = Math.min(plan.rothWithdrawal, startingBalancesThisYear.roth);

    const ssBenefits = householdSocialSecurityBenefit(
      [spouseA, spouseB],
      year,
      household.startYear,
      household.generalInflationAssumption
    );
    const socialSecurityDetail: SocialSecurityDetail = {
      spouseA: spouseSsDetail(spouseA, year, household.startYear, household.generalInflationAssumption, aliveA),
      spouseB: spouseSsDetail(spouseB, year, household.startYear, household.generalInflationAssumption, aliveB),
      // A solo household is 'single' for the whole horizon too, but there
      // was never a real spouse to "step up" from — only flag this for the
      // genuine widow's-penalty case, where a real marriage transitioned.
      isSurvivorBenefit: filingStatus === 'single' && household.householdType !== 'single',
    };

    const proRataNonTaxableFraction =
      startingBalancesThisYear.traditional > 0
        ? Math.min(1, startingBalancesThisYear.traditionalBasis / startingBalancesThisYear.traditional)
        : 0;

    const stateModule = resolveStateTaxModule(household.stateCode, household.flatRateStateFallbackRate);

    // The tax pipeline treats a voluntary Traditional withdrawal exactly
    // like a conversion — both are ordinary income drawn pro-rata against
    // traditionalBasis — they only diverge afterward in where the cash
    // goes (Roth vs. spending), which the balance rollforward below
    // handles separately.
    const taxableTraditionalDistribution = conversionAmount + traditionalWithdrawal;

    // --- Pass 1: estimate tax assuming only discretionary gains, to size the cash need. ---
    const pass1 = computeYearTax(
      tables,
      stateModule,
      filingStatus,
      age65PlusCount,
      plan.wages + plan.pension + plan.otherOrdinaryIncome + rmdAmount,
      taxableTraditionalDistribution,
      plan.discretionaryCapitalGains,
      ssBenefits,
      proRataNonTaxableFraction,
      year
    );

    // Roth withdrawals and the Traditional withdrawal are cash-in-hand
    // (unlike the conversion, which moves money to Roth rather than
    // funding spending), so both reduce what's needed from Brokerage
    // below — the Traditional withdrawal's tax bill is still covered by
    // this same cash pool via cashNeed, same as RMD's.
    const cashFromOrdinarySources =
      plan.wages +
      plan.pension +
      plan.otherOrdinaryIncome +
      rmdAmount +
      ssBenefits +
      rothWithdrawal +
      traditionalWithdrawal;
    const cashNeed = plan.targetSpending + pass1.federalResult.totalFederalTax + pass1.stateResult.stateTax;
    const shortfall = Math.max(0, cashNeed - cashFromOrdinarySources);
    const brokerageWithdrawal = Math.min(shortfall, startingBalancesThisYear.taxable);
    const taxableGainFraction =
      startingBalancesThisYear.taxable > 0
        ? Math.max(
            0,
            1 - startingBalancesThisYear.taxableCostBasis / startingBalancesThisYear.taxable
          )
        : 0;
    const gainFromWithdrawal = brokerageWithdrawal * taxableGainFraction;
    const totalCapitalGains = plan.discretionaryCapitalGains + gainFromWithdrawal;

    // --- Pass 2: recompute with the real capital gains figure. ---
    const pass2 = computeYearTax(
      tables,
      stateModule,
      filingStatus,
      age65PlusCount,
      plan.wages + plan.pension + plan.otherOrdinaryIncome + rmdAmount,
      taxableTraditionalDistribution,
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
    // Every withdrawal/conversion below is subtracted from its account
    // BEFORE that year's growth multiplier is applied, for all three
    // accounts — so this year's cash movements never earn a return, and
    // next year's growth compounds only on what's actually still invested.
    const traditionalBasisConsumed = proRataNonTaxableFraction * taxableTraditionalDistribution;
    const nextTraditional = startingBalancesThisYear.traditional - rmdAmount - conversionAmount - traditionalWithdrawal;
    const nextTraditionalBasis = Math.max(0, startingBalancesThisYear.traditionalBasis - traditionalBasisConsumed);
    const nextRoth = startingBalancesThisYear.roth + conversionAmount - rothWithdrawal;
    const nextTaxable = startingBalancesThisYear.taxable - brokerageWithdrawal;
    const taxableBasisConsumed =
      startingBalancesThisYear.taxable > 0
        ? brokerageWithdrawal * (startingBalancesThisYear.taxableCostBasis / startingBalancesThisYear.taxable)
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
      traditionalWithdrawal,
      rothWithdrawal,
      socialSecurityBenefits: ssBenefits,
      socialSecurityDetail,
      brokerageWithdrawal,
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

/**
 * For 'mfj'/'mfs' households, returns `household.spouses` completely
 * unchanged — the entire rest of this file's MFJ/widow's-penalty logic
 * (alive checks, RMD's older-living-spouse comparison, the Social Security
 * survivor step-up) runs exactly as it always has for those two, with zero
 * new branches anywhere else in this file.
 *
 * For a 'single' household, `spouses[1]` in the stored data is never
 * real — the UI doesn't even collect it — so this substitutes a phantom
 * second spouse who has already "died" two years before the horizon
 * starts (comfortably before `wasAliveBothLastYear` could ever read it as
 * true for any projected year) and draws a $0 Social Security benefit.
 * That's enough for every existing spouse-pair computation to degrade to
 * exactly the right single-person answer on its own: `aliveB` is false
 * for the whole horizon (so `filingStatus` and RMD's age selection both
 * resolve to spouse A alone), and the survivor-benefit step-up compares
 * spouse A's real benefit against a $0 hypothetical, which is a no-op.
 * See `isSurvivorBenefit`'s own household-type check below for the one
 * place this still needs a label correction (the math is right either
 * way; only the "a spouse passed away" framing would be wrong for a
 * household that never had one).
 */
function resolveEffectiveSpouses(household: HouseholdInput): [HouseholdInput['spouses'][0], HouseholdInput['spouses'][0]] {
  if (household.householdType !== 'single') return household.spouses;
  const phantomSpouse: HouseholdInput['spouses'][0] = {
    name: '',
    birthYear: household.startYear,
    assumedDeathYear: household.startYear - 2,
    ssBenefitAtFRA: 0,
    ssClaimingAge: 67,
  };
  return [household.spouses[0], phantomSpouse];
}

/** Builds the per-spouse breakdown the SS column tooltip renders, mirroring the same claiming-adjustment and inflation math householdSocialSecurityBenefit itself uses. */
function spouseSsDetail(
  spouse: HouseholdInput['spouses'][0],
  year: number,
  startYear: number,
  generalInflationAssumption: number,
  alive: boolean
) {
  return {
    name: spouse.name,
    baseAtFRA: spouse.ssBenefitAtFRA,
    hypotheticalBenefit: spouseAnnualBenefit({ ...spouse, assumedDeathYear: undefined }, year, startYear, generalInflationAssumption),
    hasClaimed: year - spouse.birthYear >= spouse.ssClaimingAge,
    claimingAge: spouse.ssClaimingAge,
    claimingAdjustmentFactor: claimingAdjustmentFactor(spouse.ssClaimingAge),
    alive,
  };
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
