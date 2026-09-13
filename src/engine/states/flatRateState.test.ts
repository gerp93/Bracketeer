import { describe, it, expect } from 'vitest';
import { createFlatRateState } from './flatRateState';

// Phase 0 smoke test — proves the test harness (vitest) is wired correctly
// end to end before Phase 1's real fixture-driven tests are written.
describe('createFlatRateState', () => {
  it('applies the flat rate to federal AGI', () => {
    const wi = createFlatRateState('WI', 0.05);
    const result = wi.computeStateTax({
      federalAgi: 100000,
      federalTaxableIncome: 88000,
      ordinaryIncome: 90000,
      capitalGains: 10000,
      socialSecurityBenefits: 0,
      filingStatus: 'mfj',
      year: 2026,
    });
    expect(result.stateTax).toBeCloseTo(5000);
    expect(result.notes[0]).toMatch(/no dedicated Bracketeer tax module/);
  });

  it('never taxes negative AGI', () => {
    const wi = createFlatRateState('WI', 0.05);
    const result = wi.computeStateTax({
      federalAgi: -5000,
      federalTaxableIncome: 0,
      ordinaryIncome: 0,
      capitalGains: -5000,
      socialSecurityBenefits: 0,
      filingStatus: 'single',
      year: 2026,
    });
    expect(result.stateTax).toBe(0);
  });
});
