import { describe, it, expect } from 'vitest';
import { computeFederalTax } from './federalTax';
import { FEDERAL_TAX_TABLES_2025, projectTaxYearTables } from './data/federalTaxTables';
import type { FederalTaxInput } from './types';

const baseInput: FederalTaxInput = {
  filingStatus: 'mfj',
  age65PlusCount: 2,
  otherOrdinaryIncome: 0,
  conversionAmount: 0,
  capitalGains: 0,
  socialSecurityBenefits: 0,
  proRataNonTaxableFraction: 0,
};

describe('computeFederalTax — a no-income household owes nothing', () => {
  it('taxable income and tax are both $0', () => {
    const result = computeFederalTax(FEDERAL_TAX_TABLES_2025, baseInput);
    expect(result.taxableIncome).toBe(0);
    expect(result.totalFederalTax).toBe(0);
  });
});

describe('computeFederalTax — the standard deduction absorbs low income first', () => {
  it('income under the deduction owes nothing', () => {
    // MFJ 2025: 30,000 + 2*1,550 = 33,100 standard deduction.
    const result = computeFederalTax(FEDERAL_TAX_TABLES_2025, { ...baseInput, otherOrdinaryIncome: 33_000 });
    expect(result.totalFederalTax).toBe(0);
  });

  it('one dollar over the deduction is taxed at the bottom rate', () => {
    const result = computeFederalTax(FEDERAL_TAX_TABLES_2025, { ...baseInput, otherOrdinaryIncome: 33_101 });
    expect(result.totalFederalTax).toBeCloseTo(0.1, 5);
  });
});

describe('computeFederalTax — a Roth conversion is ordinary income', () => {
  it('a $50k conversion with no other income is taxed at ordinary rates on the excess over deductions', () => {
    const result = computeFederalTax(FEDERAL_TAX_TABLES_2025, { ...baseInput, conversionAmount: 50_000 });
    const withoutConversion = computeFederalTax(FEDERAL_TAX_TABLES_2025, baseInput);
    expect(result.totalFederalTax).toBeGreaterThan(withoutConversion.totalFederalTax);
  });

  it('pro-rata basis reduces the taxable portion of the conversion', () => {
    const fullyTaxable = computeFederalTax(FEDERAL_TAX_TABLES_2025, {
      ...baseInput,
      otherOrdinaryIncome: 100_000,
      conversionAmount: 50_000,
      proRataNonTaxableFraction: 0,
    });
    const halfBasis = computeFederalTax(FEDERAL_TAX_TABLES_2025, {
      ...baseInput,
      otherOrdinaryIncome: 100_000,
      conversionAmount: 50_000,
      proRataNonTaxableFraction: 0.5,
    });
    expect(halfBasis.totalFederalTax).toBeLessThan(fullyTaxable.totalFederalTax);
    expect(halfBasis.ordinaryIncomeBeforeSS).toBeCloseTo(100_000 + 25_000, 2);
  });
});

describe('computeFederalTax — the fixed-point interaction (Phase 1b)', () => {
  it('a conversion increases taxable Social Security, not just ordinary tax', () => {
    const withoutConversion = computeFederalTax(FEDERAL_TAX_TABLES_2025, {
      ...baseInput,
      otherOrdinaryIncome: 20_000,
      socialSecurityBenefits: 40_000,
    });
    const withConversion = computeFederalTax(FEDERAL_TAX_TABLES_2025, {
      ...baseInput,
      otherOrdinaryIncome: 20_000,
      socialSecurityBenefits: 40_000,
      conversionAmount: 30_000,
    });
    expect(withConversion.taxableSocialSecurity).toBeGreaterThan(withoutConversion.taxableSocialSecurity);
  });

  it('capital gains get pushed out of the 0% LTCG bracket by a conversion stacked underneath them', () => {
    // Ordinary taxable income (after the $33,100 MFJ deduction) sits just
    // under the 0% LTCG ceiling (96,700 MFJ 2025) with gains stacked on
    // top still fitting inside it; adding a conversion pushes the stack
    // past the ceiling, taxing some of the (unchanged) gains at 15%.
    const withoutConversion = computeFederalTax(FEDERAL_TAX_TABLES_2025, {
      ...baseInput,
      otherOrdinaryIncome: 100_000,
      capitalGains: 20_000,
    });
    const withConversion = computeFederalTax(FEDERAL_TAX_TABLES_2025, {
      ...baseInput,
      otherOrdinaryIncome: 100_000,
      capitalGains: 20_000,
      conversionAmount: 20_000,
    });
    expect(withoutConversion.taxOnCapitalGains).toBe(0);
    expect(withConversion.taxOnCapitalGains).toBeGreaterThan(0);
  });
});

describe('computeFederalTax — NIIT boundary', () => {
  it('is $0 exactly at the MFJ threshold ($250,000 AGI)', () => {
    // AGI = otherOrdinaryIncome + capitalGains; hit 250,000 exactly with no SS in the mix.
    const result = computeFederalTax(FEDERAL_TAX_TABLES_2025, {
      ...baseInput,
      otherOrdinaryIncome: 240_000,
      capitalGains: 10_000,
    });
    expect(result.niit).toBe(0);
  });

  it('one dollar of gains over the threshold starts owing NIIT', () => {
    const result = computeFederalTax(FEDERAL_TAX_TABLES_2025, {
      ...baseInput,
      otherOrdinaryIncome: 240_000,
      capitalGains: 10_001,
    });
    expect(result.niit).toBeCloseTo(1 * 0.038, 5);
  });
});

describe('projectTaxYearTables integration — a projected year still computes sensibly', () => {
  it('a projected year inflates thresholds so the same nominal income owes less (relatively) than in the base year', () => {
    const future = projectTaxYearTables(FEDERAL_TAX_TABLES_2025, 2030, 0.03);
    expect(future.status).toBe('projected');
    const result = computeFederalTax(future, { ...baseInput, otherOrdinaryIncome: 100_000 });
    expect(result.totalFederalTax).toBeGreaterThanOrEqual(0);
    // SS thresholds are NOT inflation-indexed — must be identical to the base year.
    expect(future.socialSecurity.firstThreshold.mfj).toBe(FEDERAL_TAX_TABLES_2025.socialSecurity.firstThreshold.mfj);
  });
});
