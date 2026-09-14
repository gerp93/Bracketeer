import { describe, it, expect } from 'vitest';
import { runProjection } from './projection';
import type { HouseholdInput, YearPlanInput } from './projectionTypes';

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

describe('runProjection — a no-conversion baseline is stable', () => {
  it('produces one result per year and never goes negative on any balance', () => {
    const household = makeHousehold();
    const summary = runProjection(household, flatYearPlans(household));
    expect(summary.years.length).toBe(household.horizonYears);
    for (const y of summary.years) {
      expect(y.endingBalances.traditional).toBeGreaterThanOrEqual(0);
      expect(y.endingBalances.roth).toBeGreaterThanOrEqual(0);
      expect(y.endingBalances.taxable).toBeGreaterThanOrEqual(0);
    }
  });

  it('a larger conversion schedule raises the Roth balance and lowers the traditional balance at the horizon vs. no conversion', () => {
    const household = makeHousehold();
    const noConversion = runProjection(household, flatYearPlans(household, 0));
    const withConversion = runProjection(household, flatYearPlans(household, 50_000));
    const noConvoTerminal = noConversion.terminalBalances;
    const withConvoTerminal = withConversion.terminalBalances;
    expect(withConvoTerminal.roth).toBeGreaterThan(noConvoTerminal.roth);
    expect(withConvoTerminal.traditional).toBeLessThan(noConvoTerminal.traditional);
  });
});

describe('runProjection — IRMAA two-year lookback', () => {
  it('a high-MAGI year does not itself trigger IRMAA, but the year two years later does', () => {
    const household = makeHousehold({
      spouses: [
        { name: 'Spouse 1', birthYear: 1955, ssBenefitAtFRA: 30_000, ssClaimingAge: 67 },
        { name: 'Spouse 2', birthYear: 1956, ssBenefitAtFRA: 20_000, ssClaimingAge: 67 },
      ],
      horizonYears: 4,
    });
    const plans: YearPlanInput[] = [
      { year: 2025, conversionAmount: 300_000, traditionalWithdrawal: 0, rothWithdrawal: 0, wages: 0, pension: 0, otherOrdinaryIncome: 0, discretionaryCapitalGains: 0, targetSpending: 60_000, returnAssumption: 0.05 },
      { year: 2026, conversionAmount: 0, traditionalWithdrawal: 0, rothWithdrawal: 0, wages: 0, pension: 0, otherOrdinaryIncome: 0, discretionaryCapitalGains: 0, targetSpending: 60_000, returnAssumption: 0.05 },
      { year: 2027, conversionAmount: 0, traditionalWithdrawal: 0, rothWithdrawal: 0, wages: 0, pension: 0, otherOrdinaryIncome: 0, discretionaryCapitalGains: 0, targetSpending: 60_000, returnAssumption: 0.05 },
      { year: 2028, conversionAmount: 0, traditionalWithdrawal: 0, rothWithdrawal: 0, wages: 0, pension: 0, otherOrdinaryIncome: 0, discretionaryCapitalGains: 0, targetSpending: 60_000, returnAssumption: 0.05 },
    ];
    const summary = runProjection(household, plans);
    const y2025 = summary.years.find((y) => y.year === 2025)!;
    const y2026 = summary.years.find((y) => y.year === 2026)!;
    const y2027 = summary.years.find((y) => y.year === 2027)!;

    // 2025's own IRMAA is driven by 2023 MAGI (unknown/$0 here) -> no surcharge in 2025.
    expect(y2025.irmaaResult.annualSurchargeTotal).toBe(0);
    // 2027's IRMAA is driven by 2025's MAGI, which the big conversion drove way up.
    expect(y2027.irmaaResult.annualSurchargeTotal).toBeGreaterThan(0);
    // 2026 (driven by 2024 MAGI, also unknown/$0) should NOT yet reflect the 2025 conversion.
    expect(y2026.irmaaResult.annualSurchargeTotal).toBe(0);
  });
});

describe("runProjection — the widow's penalty", () => {
  it('switches to single filing status the year after an assumed spouse death, and flags that year', () => {
    const household = makeHousehold({
      spouses: [
        { name: 'Spouse 1', birthYear: 1955, ssBenefitAtFRA: 30_000, ssClaimingAge: 67 },
        { name: 'Spouse 2', birthYear: 1955, ssBenefitAtFRA: 20_000, assumedDeathYear: 2026, ssClaimingAge: 67 },
      ],
      horizonYears: 4,
    });
    const summary = runProjection(household, flatYearPlans(household, 0));
    const y2026 = summary.years.find((y) => y.year === 2026)!; // death year itself: still MFJ
    const y2027 = summary.years.find((y) => y.year === 2027)!; // first single year

    expect(y2026.filingStatus).toBe('mfj');
    expect(y2026.isWidowPenaltyYear).toBe(false);
    expect(y2027.filingStatus).toBe('single');
    expect(y2027.isWidowPenaltyYear).toBe(true);
  });

  it('the same total tax owed is higher as a single filer than it would be at the same income as MFJ', () => {
    // Compare two otherwise-identical households: one where both spouses
    // live the whole horizon, one where a spouse dies immediately before it
    // starts (so every projected year is single) but SS income is held
    // comparable via the survivor benefit step-up.
    const bothAlive = makeHousehold();
    const oneDied = makeHousehold({
      spouses: [
        { name: 'Spouse 1', birthYear: 1960, ssBenefitAtFRA: 30_000, ssClaimingAge: 67 },
        { name: 'Spouse 2', birthYear: 1961, ssBenefitAtFRA: 20_000, ssClaimingAge: 67, assumedDeathYear: 2024 }, // dies before the horizon starts
      ],
    });
    const bothAliveSummary = runProjection(bothAlive, flatYearPlans(bothAlive, 100_000));
    const oneDiedSummary = runProjection(oneDied, flatYearPlans(oneDied, 100_000));

    // Single-filer brackets are roughly half MFJ's width for the same nominal conversion,
    // so the same $100k conversion should cost strictly more in tax as a single filer.
    expect(oneDiedSummary.lifetimeTaxPaid).toBeGreaterThan(bothAliveSummary.lifetimeTaxPaid);
  });
});

describe('runProjection — terminal after-tax wealth', () => {
  it('haircuts the traditional balance but not Roth/taxable', () => {
    const household = makeHousehold({ assumedHeirMarginalRate: 0.3 });
    const summary = runProjection(household, flatYearPlans(household, 0));
    const naive = summary.terminalBalances.traditional + summary.terminalBalances.roth + summary.terminalBalances.taxable;
    expect(summary.terminalAfterTaxWealth).toBeLessThan(naive);
    expect(summary.terminalAfterTaxWealth).toBeCloseTo(
      summary.terminalBalances.traditional * 0.7 + summary.terminalBalances.roth + summary.terminalBalances.taxable,
      2
    );
  });
});

describe('runProjection — Roth withdrawal', () => {
  it('is tax-free: pulling from Roth instead of Brokerage leaves total tax unchanged when the Brokerage draw has no gain to realize', () => {
    // taxableCostBasis == taxable, so however much gets pulled from
    // Brokerage to cover the gap, it never realizes a capital gain —
    // isolating the claim that the Roth withdrawal itself has zero tax
    // effect, rather than an indirect one via a smaller Brokerage draw.
    const household = makeHousehold({
      startingBalances: {
        traditional: 1_000_000,
        traditionalBasis: 0,
        roth: 100_000,
        taxable: 200_000,
        taxableCostBasis: 200_000,
      },
    });
    const base = flatYearPlans(household, 0);
    const withWithdrawal = base.map((p, i) => (i === 0 ? { ...p, rothWithdrawal: 20_000 } : p));

    const baseSummary = runProjection(household, base);
    const withdrawalSummary = runProjection(household, withWithdrawal);

    expect(withdrawalSummary.years[0].rothWithdrawal).toBe(20_000);
    expect(withdrawalSummary.years[0].totalTax).toBeCloseTo(baseSummary.years[0].totalTax, 2);
    expect(withdrawalSummary.years[0].endingBalances.roth).toBeCloseTo(
      baseSummary.years[0].endingBalances.roth - 20_000 * 1.05,
      2
    );
  });

  it('reduces how much has to come out of the Brokerage account to cover spending', () => {
    const household = makeHousehold();
    const noWithdrawal = flatYearPlans(household, 0).map((p, i) => (i === 0 ? { ...p, targetSpending: 90_000 } : p));
    const withWithdrawal = noWithdrawal.map((p, i) =>
      i === 0 ? { ...p, rothWithdrawal: 50_000 } : p
    );

    const noWithdrawalSummary = runProjection(household, noWithdrawal);
    const withWithdrawalSummary = runProjection(household, withWithdrawal);

    expect(withWithdrawalSummary.years[0].endingBalances.taxable).toBeGreaterThan(
      noWithdrawalSummary.years[0].endingBalances.taxable
    );
  });

  it('caps the withdrawal at the Roth balance at the start of the year', () => {
    const household = makeHousehold({
      startingBalances: {
        traditional: 1_000_000,
        traditionalBasis: 0,
        roth: 10_000,
        taxable: 200_000,
        taxableCostBasis: 150_000,
      },
    });
    const plans = flatYearPlans(household, 0).map((p, i) => (i === 0 ? { ...p, rothWithdrawal: 999_000 } : p));
    const summary = runProjection(household, plans);

    expect(summary.years[0].rothWithdrawal).toBe(10_000);
    expect(summary.years[0].endingBalances.roth).toBeCloseTo(0, 5);
  });
});

describe('runProjection — Traditional withdrawal (voluntary, beyond RMD, taken to spend)', () => {
  it('unlike Roth, is taxable ordinary income: shifting the same cash need from a no-gain Brokerage draw to a Traditional withdrawal raises total tax', () => {
    const household = makeHousehold({
      startingBalances: {
        traditional: 1_000_000,
        traditionalBasis: 0,
        roth: 100_000,
        taxable: 200_000,
        taxableCostBasis: 200_000, // zero embedded gain, so the baseline Brokerage draw is tax-free basis return
      },
    });
    const base = flatYearPlans(household, 0).map((p, i) => (i === 0 ? { ...p, targetSpending: 90_000 } : p));
    const withWithdrawal = base.map((p, i) => (i === 0 ? { ...p, traditionalWithdrawal: 20_000 } : p));

    const baseSummary = runProjection(household, base);
    const withdrawalSummary = runProjection(household, withWithdrawal);

    expect(withdrawalSummary.years[0].traditionalWithdrawal).toBe(20_000);
    expect(withdrawalSummary.years[0].totalTax).toBeGreaterThan(baseSummary.years[0].totalTax);
  });

  it('reduces how much has to come out of the Brokerage account to cover spending, same as a Roth withdrawal', () => {
    const household = makeHousehold();
    const noWithdrawal = flatYearPlans(household, 0).map((p, i) => (i === 0 ? { ...p, targetSpending: 90_000 } : p));
    const withWithdrawal = noWithdrawal.map((p, i) =>
      i === 0 ? { ...p, traditionalWithdrawal: 50_000 } : p
    );

    const noWithdrawalSummary = runProjection(household, noWithdrawal);
    const withWithdrawalSummary = runProjection(household, withWithdrawal);

    expect(withWithdrawalSummary.years[0].endingBalances.taxable).toBeGreaterThan(
      noWithdrawalSummary.years[0].endingBalances.taxable
    );
  });

  it('reduces the Traditional balance, unlike entering the same amount as other ordinary income', () => {
    const household = makeHousehold();
    const plans = flatYearPlans(household, 0).map((p, i) => (i === 0 ? { ...p, traditionalWithdrawal: 50_000 } : p));
    const summary = runProjection(household, plans);
    const rmd = summary.years[0].rmdAmount;

    expect(summary.years[0].endingBalances.traditional).toBeCloseTo(
      (household.startingBalances.traditional - rmd - 50_000) * 1.05,
      2
    );
  });

  it('caps the withdrawal at what is left in Traditional after this year\'s RMD and Conversion — Conversion is resolved first', () => {
    const household = makeHousehold({
      startingBalances: {
        traditional: 100_000,
        traditionalBasis: 0,
        roth: 100_000,
        taxable: 200_000,
        taxableCostBasis: 150_000,
      },
    });
    const plans = flatYearPlans(household, 60_000).map((p, i) =>
      i === 0 ? { ...p, traditionalWithdrawal: 999_000 } : p
    );
    const summary = runProjection(household, plans);
    const y0 = summary.years[0];

    expect(y0.conversionAmount).toBe(60_000); // unaffected by the withdrawal request
    expect(y0.traditionalWithdrawal).toBeCloseTo(100_000 - y0.rmdAmount - 60_000, 2);
    expect(y0.endingBalances.traditional).toBeCloseTo(0, 5);
  });

  it('applies growth after subtracting the withdrawal, not before', () => {
    const household = makeHousehold({
      startingBalances: {
        traditional: 500_000,
        traditionalBasis: 0,
        roth: 100_000,
        taxable: 200_000,
        taxableCostBasis: 150_000,
      },
    });
    const plans = flatYearPlans(household, 0).map((p, i) =>
      i === 0 ? { ...p, traditionalWithdrawal: 50_000, returnAssumption: 0.1 } : p
    );
    const summary = runProjection(household, plans);
    const rmd = summary.years[0].rmdAmount;

    expect(summary.years[0].endingBalances.traditional).toBeCloseTo(
      (500_000 - rmd - 50_000) * 1.1,
      2
    );
  });
});

describe('runProjection — Brokerage withdrawal (automatic, funds the spending + tax shortfall)', () => {
  it('is exposed as its own field, consistent with the ending taxable balance', () => {
    const household = makeHousehold();
    const plans = flatYearPlans(household, 0).map((p, i) => (i === 0 ? { ...p, targetSpending: 90_000 } : p));
    const summary = runProjection(household, plans);
    const y0 = summary.years[0];

    expect(y0.brokerageWithdrawal).toBeGreaterThan(0);
    expect(y0.endingBalances.taxable).toBeCloseTo(
      (household.startingBalances.taxable - y0.brokerageWithdrawal) * 1.05,
      2
    );
  });

  it('drops to zero once Traditional and Roth withdrawals fully cover the spending need', () => {
    const household = makeHousehold();
    const plans = flatYearPlans(household, 0).map((p, i) =>
      i === 0 ? { ...p, targetSpending: 40_000, traditionalWithdrawal: 60_000 } : p
    );
    const summary = runProjection(household, plans);

    expect(summary.years[0].brokerageWithdrawal).toBe(0);
  });
});
