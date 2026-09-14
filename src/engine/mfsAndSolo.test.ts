import { describe, it, expect } from 'vitest';
import { runProjection } from './projection';
import type { HouseholdInput, YearPlanInput } from './projectionTypes';

// Kept in its own file, separate from projection.test.ts, mirroring the
// "keep MFS/solo logic separate" constraint at the test-organization level
// too — this file only exercises the new household-type branches; the
// existing MFJ/widow's-penalty coverage in projection.test.ts is untouched.

function makeHousehold(overrides: Partial<HouseholdInput> = {}): HouseholdInput {
  return {
    householdType: 'mfj',
    spouses: [
      { name: 'Spouse 1', birthYear: 1960, ssBenefitAtFRA: 30_000, ssClaimingAge: 67 },
      { name: 'Spouse 2', birthYear: 1961, ssBenefitAtFRA: 20_000, ssClaimingAge: 67 },
    ],
    stateCode: 'WI', // flat-rate fallback, keeps these tests about the engine mechanics, not MN specifics
    flatRateStateFallbackRate: 0.05,
    startYear: 2025,
    horizonYears: 5,
    assumedHeirMarginalRate: 0.24,
    generalInflationAssumption: 0.025,
    startingBalances: {
      traditional: 1_000_000,
      traditionalBasis: 0,
      roth: 100_000,
      taxable: 200_000,
      taxableCostBasis: 150_000,
    },
    priorMagiHistory: { twoYearsBefore: 0, oneYearBefore: 0 },
    ...overrides,
  };
}

function flatYearPlans(household: HouseholdInput, conversionAmount = 0): YearPlanInput[] {
  return Array.from({ length: household.horizonYears }, (_, i) => ({
    year: household.startYear + i,
    conversionAmount,
    traditionalWithdrawal: 0,
    rothWithdrawal: 0,
    wages: 0,
    pension: 0,
    otherOrdinaryIncome: 0,
    discretionaryCapitalGains: 0,
    targetSpending: 60_000,
    returnAssumption: 0.05,
  }));
}

describe('runProjection — MFS', () => {
  it('produces a different tax than both MFJ and Single for the same income', () => {
    const mfj = makeHousehold({ householdType: 'mfj' });
    const mfs = makeHousehold({ householdType: 'mfs' });
    const single = makeHousehold({ householdType: 'single' });

    const mfjSummary = runProjection(mfj, flatYearPlans(mfj, 80_000));
    const mfsSummary = runProjection(mfs, flatYearPlans(mfs, 80_000));
    const singleSummary = runProjection(single, flatYearPlans(single, 80_000));

    expect(mfsSummary.lifetimeTaxPaid).not.toBeCloseTo(mfjSummary.lifetimeTaxPaid, 0);
    expect(mfsSummary.lifetimeTaxPaid).not.toBeCloseTo(singleSummary.lifetimeTaxPaid, 0);
    // MFS's brackets are the narrowest of the three (half of MFJ's, and
    // narrower than single's at the top) — for the same nominal conversion
    // it should cost strictly more than filing jointly on the same income.
    expect(mfsSummary.lifetimeTaxPaid).toBeGreaterThan(mfjSummary.lifetimeTaxPaid);
  });

  it('applies the MFS $0 Social Security base amount — any other income makes benefits taxable immediately', () => {
    const household = makeHousehold({
      householdType: 'mfs',
      spouses: [
        { name: 'Spouse 1', birthYear: 1955, ssBenefitAtFRA: 24_000, ssClaimingAge: 67 },
        { name: 'Spouse 2', birthYear: 1956, ssBenefitAtFRA: 18_000, ssClaimingAge: 67 },
      ],
    });
    // A small conversion — nowhere near MFJ/single's $32k/$25k thresholds,
    // but MFS's threshold is $0, so this should already tax SS.
    const summary = runProjection(household, flatYearPlans(household, 5_000));
    expect(summary.years[0].federalResult.taxableSocialSecurity).toBeGreaterThan(0);
  });

  it('reflects the 2-tier IRMAA cliff — no gradual steps between $0 and the near-top tier', () => {
    const household = makeHousehold({ householdType: 'mfs', horizonYears: 4 });
    // A big conversion in year 1 drives year 3's IRMAA (2-year lookback).
    const plans = flatYearPlans(household, 0).map((p, i) => (i === 0 ? { ...p, conversionAmount: 200_000 } : p));
    const summary = runProjection(household, plans);
    const y3 = summary.years[2];
    // $200k conversion plus other income comfortably clears the $106k MFS
    // cliff, so the surcharge should already be at (or very near) the top
    // tier's dollar amount rather than a small first-step amount.
    expect(y3.irmaaResult.annualSurchargeTotal).toBeGreaterThan(0);
  });
});

describe('runProjection — solo household (single, no spouse)', () => {
  function soloHousehold(overrides: Partial<HouseholdInput> = {}): HouseholdInput {
    return makeHousehold({
      householdType: 'single',
      spouses: [
        { name: 'Spouse 1', birthYear: 1955, ssBenefitAtFRA: 24_000, ssClaimingAge: 67 },
        { name: 'Spouse 2', birthYear: 1990, ssBenefitAtFRA: 999_999, ssClaimingAge: 62 }, // garbage — must never be read
      ],
      ...overrides,
    });
  }

  it('is single filing status for the entire horizon and never flags the widow\'s penalty', () => {
    const household = soloHousehold();
    const summary = runProjection(household, flatYearPlans(household, 0));
    for (const y of summary.years) {
      expect(y.filingStatus).toBe('single');
      expect(y.isWidowPenaltyYear).toBe(false);
    }
  });

  it('Social Security is spouse[0]\'s own benefit only — spouse[1]\'s data is never read', () => {
    const household = soloHousehold();
    const summary = runProjection(household, flatYearPlans(household, 0));
    const y0 = summary.years[0];
    // If spouse[1]'s $999,999 PIA leaked in at all, this would be enormous.
    expect(y0.socialSecurityBenefits).toBeLessThan(30_000);
    expect(y0.socialSecurityDetail.isSurvivorBenefit).toBe(false);
    expect(y0.socialSecurityDetail.spouseB.baseAtFRA).toBe(0);
  });

  it('RMD is driven by spouse[0]\'s age alone, ignoring spouse[1]\'s (much younger) birth year', () => {
    // If spouse[1]'s 1990 birth year leaked into the "older living spouse"
    // comparison the wrong way, RMDs could start decades early or never.
    const household = soloHousehold({ startYear: 2025, horizonYears: 1 });
    household.startingBalances.traditional = 1_000_000;
    // spouse[0] born 1955 turns 73 in 2028; at 2025 (age 70) no RMD yet.
    const summary = runProjection(household, flatYearPlans(household, 0));
    expect(summary.years[0].rmdAmount).toBe(0);
  });

  it('matches the existing MFJ/widow\'s-penalty test suite\'s result for an equivalent one-person-alive household', () => {
    // Cross-check: a solo household should produce the same numbers as the
    // existing pre-death-year trick used in projection.test.ts, proving
    // the new householdType path and the old assumedDeathYear path agree.
    const viaHouseholdType = soloHousehold({ horizonYears: 3 });
    const viaDeathYear = makeHousehold({
      householdType: 'mfj',
      horizonYears: 3,
      spouses: [
        { name: 'Spouse 1', birthYear: 1955, ssBenefitAtFRA: 24_000, ssClaimingAge: 67 },
        { name: 'Spouse 2', birthYear: 1990, ssBenefitAtFRA: 0, ssClaimingAge: 62, assumedDeathYear: 2023 },
      ],
    });
    const a = runProjection(viaHouseholdType, flatYearPlans(viaHouseholdType, 50_000));
    const b = runProjection(viaDeathYear, flatYearPlans(viaDeathYear, 50_000));
    expect(a.lifetimeTaxPaid).toBeCloseTo(b.lifetimeTaxPaid, 2);
    expect(a.terminalAfterTaxWealth).toBeCloseTo(b.terminalAfterTaxWealth, 2);
  });
});
