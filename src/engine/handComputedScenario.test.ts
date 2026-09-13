import { describe, it, expect } from 'vitest';
import { computeFederalTax } from './federalTax';
import { FEDERAL_TAX_TABLES_2025 } from './data/federalTaxTables';
import { createMinnesotaTaxModule } from './states/minnesotaTax';
import type { FederalTaxInput } from './types';

/**
 * BRACKETEER_BUILD_PLAN.md Phase 6: validation against an INDEPENDENTLY
 * hand-computed scenario, not just the boundary-focused unit tests
 * elsewhere in this suite. This is the "does a realistic full return match
 * a hand-worked example" check — different from "is each boundary correct
 * in isolation." Numbers below are worked by hand against the 2025 MFJ
 * tables in federalTaxTables.ts / minnesotaTaxTables.ts; if this test ever
 * fails, treat it as more serious than a boundary test failing — it means
 * the pieces don't compose correctly even if each piece is individually
 * right.
 *
 * Scenario: MFJ household, no Social Security, no capital gains, both
 * under 65. $50,000 wages + a $40,000 Roth conversion, no basis.
 */
describe('Hand-computed scenario — MFJ, wages + conversion, no SS/gains', () => {
  const input: FederalTaxInput = {
    filingStatus: 'mfj',
    age65PlusCount: 0,
    otherOrdinaryIncome: 50_000,
    conversionAmount: 40_000,
    capitalGains: 0,
    socialSecurityBenefits: 0,
    proRataNonTaxableFraction: 0,
  };

  it('matches the hand-computed federal taxable income and tax', () => {
    const result = computeFederalTax(FEDERAL_TAX_TABLES_2025, input);

    // Total ordinary income: 50,000 wages + 40,000 conversion = 90,000. No SS to tax.
    expect(result.totalOrdinaryIncome).toBe(90_000);

    // MFJ 2025 standard deduction (no 65+ addition): 30,000.
    // Taxable income: 90,000 - 30,000 = 60,000.
    expect(result.taxableIncome).toBe(60_000);

    // Tax by hand: 10% of first 23,200 = 2,320.00
    //              12% of (60,000 - 23,200) = 12% of 36,800 = 4,416.00
    //              Total = 6,736.00
    const expectedFederalTax = 23_200 * 0.1 + 36_800 * 0.12;
    expect(expectedFederalTax).toBeCloseTo(6_736, 2);
    expect(result.taxOnOrdinaryIncome).toBeCloseTo(6_736, 2);
    expect(result.totalFederalTax).toBeCloseTo(6_736, 2);

    // NIIT: AGI (90,000) is well under the $250,000 MFJ threshold -> $0.
    expect(result.niit).toBe(0);

    // No capital gains -> no LTCG tax.
    expect(result.taxOnCapitalGains).toBe(0);
  });

  it('matches the hand-computed Minnesota taxable income and tax', () => {
    const federalResult = computeFederalTax(FEDERAL_TAX_TABLES_2025, input);
    const mn = createMinnesotaTaxModule();
    const stateResult = mn.computeStateTax({
      federalAgi: federalResult.adjustedGrossIncome,
      federalTaxableIncome: federalResult.taxableIncome,
      ordinaryIncome: federalResult.totalOrdinaryIncome,
      capitalGains: 0,
      socialSecurityBenefits: 0,
      filingStatus: 'mfj',
      year: 2025,
    });

    // Federal AGI = 90,000 (no capital gains, no taxable SS to add).
    expect(federalResult.adjustedGrossIncome).toBe(90_000);

    // MN standard deduction: 90,000 is well under the $220,650 MFJ
    // phase-out start, so the FULL base deduction applies: $29,150.
    // MN taxable income: 90,000 - 29,150 = 60,850. No SS subtraction (no SS benefits).
    expect(stateResult.stateTaxableIncome).toBeCloseTo(60_850, 2);

    // MN tax by hand: 5.35% of first 47,620 = 2,547.67
    //                 6.80% of (60,850 - 47,620) = 6.80% of 13,230 = 899.64
    //                 Total = 3,447.31
    const expectedMnTax = 47_620 * 0.0535 + 13_230 * 0.068;
    expect(expectedMnTax).toBeCloseTo(3_447.31, 1);
    expect(stateResult.stateTax).toBeCloseTo(expectedMnTax, 1);
  });

  it('combined federal + state effective rate is a plausible number for this income level', () => {
    const federalResult = computeFederalTax(FEDERAL_TAX_TABLES_2025, input);
    const mn = createMinnesotaTaxModule();
    const stateResult = mn.computeStateTax({
      federalAgi: federalResult.adjustedGrossIncome,
      federalTaxableIncome: federalResult.taxableIncome,
      ordinaryIncome: federalResult.totalOrdinaryIncome,
      capitalGains: 0,
      socialSecurityBenefits: 0,
      filingStatus: 'mfj',
      year: 2025,
    });

    const totalTax = federalResult.totalFederalTax + stateResult.stateTax;
    const effectiveRate = totalTax / federalResult.adjustedGrossIncome;

    // A sanity band, not a precise assertion: for $90k AGI MFJ with a
    // conversion in the middle of the 12% federal / 6.8% MN brackets, a
    // combined effective rate outside roughly 8%-15% would indicate
    // something is structurally wrong, not just imprecise.
    expect(effectiveRate).toBeGreaterThan(0.08);
    expect(effectiveRate).toBeLessThan(0.15);
  });
});
