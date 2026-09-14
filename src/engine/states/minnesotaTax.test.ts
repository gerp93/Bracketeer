import { describe, it, expect } from 'vitest';
import { createMinnesotaTaxModule } from './minnesotaTax';
import type { StateTaxInput } from '../types';

const mn = createMinnesotaTaxModule();

const baseInput: StateTaxInput = {
  federalAgi: 0,
  federalTaxableIncome: 0,
  ordinaryIncome: 0,
  capitalGains: 0,
  socialSecurityBenefits: 0,
  filingStatus: 'mfj',
  year: 2025,
};

describe('Minnesota — no income owes nothing', () => {
  it('taxable income and tax are both $0', () => {
    const result = mn.computeStateTax(baseInput);
    expect(result.stateTaxableIncome).toBe(0);
    expect(result.stateTax).toBe(0);
  });
});

describe('Minnesota — capital gains are ordinary income, no 0%/15% break', () => {
  it('a household with only capital gains still owes MN tax on the amount over the deduction', () => {
    // $50k AGI entirely from gains, well under the federal 0% LTCG ceiling
    // (would owe $0 federal LTCG tax) but MN has no such carve-out.
    const result = mn.computeStateTax({ ...baseInput, federalAgi: 50_000, capitalGains: 50_000 });
    expect(result.stateTax).toBeGreaterThan(0);
  });
});

describe('Minnesota — standard deduction phase-down', () => {
  it('is the full base amount below the phase-out start', () => {
    const low = mn.computeStateTax({ ...baseInput, federalAgi: 100_000 });
    // 100,000 - 29,900 (full MFJ deduction) = 70,100 taxable.
    expect(low.stateTaxableIncome).toBeCloseTo(100_000 - 29_900, 2);
  });

  it('shrinks the deduction above the phase-out start, raising taxable income faster than income itself rose', () => {
    // Phase-out start (MFJ 2025) = 238,950.
    const atStart = mn.computeStateTax({ ...baseInput, federalAgi: 238_950 });
    const over = mn.computeStateTax({ ...baseInput, federalAgi: 338_950 }); // +100,000
    const taxableIncomeIncrease = over.stateTaxableIncome - atStart.stateTaxableIncome;
    expect(taxableIncomeIncrease).toBeGreaterThan(100_000); // deduction shrank, so more than the raw income increase became taxable
  });
});

describe('Minnesota — Social Security subtraction phase-out', () => {
  const ssBenefits = 30_000;

  it('subtracts the full amount (up to the cap) below the phase-out start', () => {
    const result = mn.computeStateTax({
      ...baseInput,
      federalAgi: 60_000,
      socialSecurityBenefits: ssBenefits,
    });
    // MFJ subtraction cap 2025 = 6,960; federalAgi 60,000 < phaseout start 88,630.
    expect(result.stateTaxableIncome).toBeCloseTo(60_000 - 29_900 - 6_960, 2);
  });

  it('a conversion that pushes AGI over the phase-out start loses subtraction on top of the added income', () => {
    // Phase-out start (MFJ 2025) = 88,630.
    const belowStart = mn.computeStateTax({
      ...baseInput,
      federalAgi: 88_630,
      socialSecurityBenefits: ssBenefits,
    });
    const conversionPushesOver = mn.computeStateTax({
      ...baseInput,
      federalAgi: 88_630 + 10_000, // a $10k conversion
      socialSecurityBenefits: ssBenefits,
    });
    const taxableIncomeIncrease = conversionPushesOver.stateTaxableIncome - belowStart.stateTaxableIncome;
    // The $10k conversion itself is taxable, PLUS $1,000 of subtraction is lost (10% of 10,000) —
    // so taxable income should rise by more than the $10k conversion alone.
    expect(taxableIncomeIncrease).toBeGreaterThan(10_000);
    expect(taxableIncomeIncrease).toBeCloseTo(11_000, 2);
  });

  it('flags the phase-out in notes once it starts', () => {
    const result = mn.computeStateTax({
      ...baseInput,
      federalAgi: 100_000,
      socialSecurityBenefits: ssBenefits,
    });
    expect(result.notes.some((n) => n.includes('phased out'))).toBe(true);
  });

  it('subtraction never goes negative — floors at $0', () => {
    const result = mn.computeStateTax({
      ...baseInput,
      federalAgi: 5_000_000,
      socialSecurityBenefits: ssBenefits,
    });
    expect(result.stateTaxableIncome).toBeCloseTo(
      5_000_000 - MN_STANDARD_DEDUCTION_FLOOR(),
      -2
    );
  });
});

function MN_STANDARD_DEDUCTION_FLOOR(): number {
  // Mirrors the module's own floor (20% of the MFJ base, 29,900) for the assertion above.
  return 29_900 * 0.2;
}
