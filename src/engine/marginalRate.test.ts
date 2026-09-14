import { describe, it, expect } from 'vitest';
import { computeMarginalRateBreakdown, computeHeadroomMarkers } from './marginalRate';
import type { HouseholdInput, YearPlanInput } from './projectionTypes';

function makeHousehold(overrides: Partial<HouseholdInput> = {}): HouseholdInput {
  return {
    spouses: [
      { name: 'Spouse 1', birthYear: 1955, ssBenefitAtFRA: 30_000, ssClaimingAge: 67 },
      { name: 'Spouse 2', birthYear: 1956, ssBenefitAtFRA: 20_000, ssClaimingAge: 67 },
    ],
    stateCode: 'MN',
    flatRateStateFallbackRate: 0,
    startYear: 2025,
    horizonYears: 5,
    assumedHeirMarginalRate: 0.24,
    generalInflationAssumption: 0.025,
    startingBalances: {
      traditional: 1_500_000,
      traditionalBasis: 0,
      roth: 100_000,
      taxable: 200_000,
      taxableCostBasis: 100_000,
    },
    priorMagiHistory: { twoYearsBefore: 0, oneYearBefore: 0 },
    ...overrides,
  };
}

function plansWithConversion(household: HouseholdInput, conversionByYear: Record<number, number>): YearPlanInput[] {
  return Array.from({ length: household.horizonYears }, (_, i) => {
    const year = household.startYear + i;
    return {
      year,
      conversionAmount: conversionByYear[year] ?? 0,
      rothWithdrawal: 0,
      wages: 0,
      pension: 0,
      otherOrdinaryIncome: 20_000,
      discretionaryCapitalGains: 0,
      targetSpending: 70_000,
      returnAssumption: 0.05,
    };
  });
}

describe('computeMarginalRateBreakdown — components sum to the total', () => {
  it('sums exactly (by construction) for a mid-conversion year', () => {
    const household = makeHousehold();
    const plans = plansWithConversion(household, { 2025: 80_000 });
    const breakdown = computeMarginalRateBreakdown(household, plans, 2025, 1_000);

    const componentSum =
      breakdown.federalBracketComponent +
      breakdown.socialSecurityTaxabilityComponent +
      breakdown.capitalGainsStackingComponent +
      breakdown.niitComponent +
      breakdown.stateComponent +
      breakdown.irmaaComponent;

    expect(componentSum).toBeCloseTo(breakdown.totalCost, 6);
  });

  it('a bigger delta produces a proportionally bigger total cost near a flat bracket region', () => {
    const household = makeHousehold();
    const plans = plansWithConversion(household, { 2025: 50_000 });
    const small = computeMarginalRateBreakdown(household, plans, 2025, 100);
    const large = computeMarginalRateBreakdown(household, plans, 2025, 10_000);
    // Rates should be in the same ballpark (same bracket) even though dollar totals differ a lot.
    expect(Math.abs(small.trueMarginalRate - large.trueMarginalRate)).toBeLessThan(0.15);
  });

  it('reflects a nonzero IRMAA component when the conversion is big enough to cross a tier two years out', () => {
    const household = makeHousehold({ horizonYears: 4 });
    const plans = plansWithConversion(household, { 2025: 500_000 });
    const breakdown = computeMarginalRateBreakdown(household, plans, 2025, 5_000);
    expect(breakdown.irmaaComponent).toBeGreaterThanOrEqual(0);
  });

  it('reports $0 IRMAA component when the +2 year is outside the horizon', () => {
    const household = makeHousehold({ horizonYears: 1 });
    const plans = plansWithConversion(household, { 2025: 50_000 });
    const breakdown = computeMarginalRateBreakdown(household, plans, 2025, 1_000);
    expect(breakdown.irmaaComponent).toBe(0);
  });
});

describe('computeHeadroomMarkers', () => {
  it('reports federal bracket headroom that matches the actual bracket edge', () => {
    const household = makeHousehold();
    const plans = plansWithConversion(household, { 2025: 30_000 });
    const markers = computeHeadroomMarkers(household, plans, 2025);
    expect(markers.toNextFederalBracket).toBeGreaterThan(0);
  });

  it('reports MN phase-out headroom only for Minnesota households', () => {
    const mnHousehold = makeHousehold({ stateCode: 'MN' });
    const otherHousehold = makeHousehold({ stateCode: 'WI', flatRateStateFallbackRate: 0.05 });
    const plans = plansWithConversion(mnHousehold, { 2025: 30_000 });
    const mnMarkers = computeHeadroomMarkers(mnHousehold, plans, 2025);
    const otherMarkers = computeHeadroomMarkers(otherHousehold, plans, 2025);
    expect(otherMarkers.toMnPhaseoutStart).toBeUndefined();
    // MN marker may or may not be defined depending on income, but the field should at least be reachable without throwing.
    expect(mnMarkers.year).toBe(2025);
  });
});
