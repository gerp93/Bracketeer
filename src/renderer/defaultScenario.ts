import type { HouseholdInput, YearPlanInput } from '../engine/projectionTypes';

const CURRENT_YEAR = new Date().getFullYear();

export function makeDefaultHousehold(): HouseholdInput {
  return {
    householdType: 'mfj',
    spouses: [
      { name: 'Spouse 1', birthYear: CURRENT_YEAR - 62, ssBenefitAtFRA: 30_000, ssClaimingAge: 67 },
      { name: 'Spouse 2', birthYear: CURRENT_YEAR - 60, ssBenefitAtFRA: 24_000, ssClaimingAge: 67 },
    ],
    stateCode: 'MN',
    flatRateStateFallbackRate: 0.05,
    startYear: CURRENT_YEAR,
    horizonYears: 30,
    assumedHeirMarginalRate: 0.24,
    generalInflationAssumption: 0.025,
    startingBalances: {
      traditional: 1_200_000,
      traditionalBasis: 0,
      roth: 150_000,
      taxable: 300_000,
      taxableCostBasis: 200_000,
    },
    priorMagiHistory: { twoYearsBefore: 0, oneYearBefore: 0 },
  };
}

const DEFAULT_RETURN_ASSUMPTION = 0.05;

function defaultYearPlan(year: number, returnAssumption: number = DEFAULT_RETURN_ASSUMPTION): YearPlanInput {
  return {
    year,
    conversionAmount: 0,
    traditionalWithdrawal: 0,
    rothWithdrawal: 0,
    wages: 0,
    pension: 0,
    otherOrdinaryIncome: 0,
    discretionaryCapitalGains: 0,
    targetSpending: 70_000,
    returnAssumption,
  };
}

/** Regenerates a flat set of year plans spanning the household's horizon — used when the horizon/start year changes, or on first load. Existing per-year edits should be merged in by the caller, not blown away. */
export function makeDefaultYearPlans(household: HouseholdInput): YearPlanInput[] {
  return Array.from({ length: household.horizonYears }, (_, i) => defaultYearPlan(household.startYear + i));
}

/** Merge a household's current horizon onto an existing plan array — keeps edits for years still in range, adds defaults for new years, drops years that fell out of range. New years pick up whatever return assumption the existing years already share, rather than silently reverting to the default. */
export function reconcileYearPlans(household: HouseholdInput, existing: YearPlanInput[]): YearPlanInput[] {
  const byYear = new Map(existing.map((p) => [p.year, p]));
  const currentReturnAssumption = existing[0]?.returnAssumption ?? DEFAULT_RETURN_ASSUMPTION;
  return Array.from({ length: household.horizonYears }, (_, i) => {
    const year = household.startYear + i;
    const found = byYear.get(year);
    return found ? normalizeYearPlan(found) : defaultYearPlan(year, currentReturnAssumption);
  });
}

/** Applies one blended return rate to every year plan at once — the UI exposes this as a single household-level assumption, even though the engine models it per year. */
export function setReturnAssumptionForAllYears(yearPlans: YearPlanInput[], returnAssumption: number): YearPlanInput[] {
  return yearPlans.map((p) => ({ ...p, returnAssumption }));
}

/**
 * Backfills fields that didn't exist when a scenario was saved to disk —
 * scenarios persist as a raw JSON blob of whatever shape HouseholdInput/
 * YearPlanInput had at save time (see main/database/schema.ts), so an older
 * scenario loaded after the engine gains a new field is missing it entirely
 * rather than having it as undefined-but-present. Apply this to every
 * scenario read back from storage before it touches the engine.
 */
export function normalizeHousehold(household: HouseholdInput): HouseholdInput {
  const [a, b] = household.spouses;
  return {
    ...household,
    householdType: household.householdType ?? 'mfj',
    spouses: [
      { ...a, name: a.name ?? '' },
      { ...b, name: b.name ?? '' },
    ],
    priorMagiHistory: household.priorMagiHistory ?? { twoYearsBefore: 0, oneYearBefore: 0 },
  };
}

export function normalizeYearPlan(plan: YearPlanInput): YearPlanInput {
  return {
    ...plan,
    rothWithdrawal: plan.rothWithdrawal ?? 0,
    traditionalWithdrawal: plan.traditionalWithdrawal ?? 0,
  };
}

export function normalizeYearPlans(plans: YearPlanInput[]): YearPlanInput[] {
  return plans.map(normalizeYearPlan);
}
