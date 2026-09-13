import type { HouseholdInput, YearPlanInput } from '../engine/projectionTypes';

const CURRENT_YEAR = new Date().getFullYear();

export function makeDefaultHousehold(): HouseholdInput {
  return {
    spouses: [
      { birthYear: CURRENT_YEAR - 62, ssBenefitAtFRA: 30_000, ssClaimingAge: 67 },
      { birthYear: CURRENT_YEAR - 60, ssBenefitAtFRA: 24_000, ssClaimingAge: 67 },
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
  };
}

/** Regenerates a flat set of year plans spanning the household's horizon — used when the horizon/start year changes, or on first load. Existing per-year edits should be merged in by the caller, not blown away. */
export function makeDefaultYearPlans(household: HouseholdInput): YearPlanInput[] {
  return Array.from({ length: household.horizonYears }, (_, i) => ({
    year: household.startYear + i,
    conversionAmount: 0,
    wages: 0,
    pension: 0,
    otherOrdinaryIncome: 0,
    discretionaryCapitalGains: 0,
    targetSpending: 70_000,
    returnAssumption: 0.05,
  }));
}

/** Merge a household's current horizon onto an existing plan array — keeps edits for years still in range, adds defaults for new years, drops years that fell out of range. */
export function reconcileYearPlans(household: HouseholdInput, existing: YearPlanInput[]): YearPlanInput[] {
  const byYear = new Map(existing.map((p) => [p.year, p]));
  return Array.from({ length: household.horizonYears }, (_, i) => {
    const year = household.startYear + i;
    return (
      byYear.get(year) ?? {
        year,
        conversionAmount: 0,
        wages: 0,
        pension: 0,
        otherOrdinaryIncome: 0,
        discretionaryCapitalGains: 0,
        targetSpending: 70_000,
        returnAssumption: 0.05,
      }
    );
  });
}
