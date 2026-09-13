import { describe, it, expect } from 'vitest';
import { taxableSocialSecurity } from './socialSecurity';
import { FEDERAL_TAX_TABLES_2025 } from './data/federalTaxTables';

describe('taxableSocialSecurity (MFJ)', () => {
  const ssBenefits = 40_000;

  it('is $0 below the first threshold ($32,000 provisional income)', () => {
    // provisional income = otherIncome + ssBenefits/2 = otherIncome + 20,000
    // stay under 32,000 -> otherIncome < 12,000
    const taxable = taxableSocialSecurity(ssBenefits, 10_000, 'mfj', FEDERAL_TAX_TABLES_2025);
    expect(taxable).toBe(0);
  });

  it('is exactly $0 at the first-threshold boundary', () => {
    // otherIncome = 12,000 -> provisional = 32,000 exactly
    const taxable = taxableSocialSecurity(ssBenefits, 12_000, 'mfj', FEDERAL_TAX_TABLES_2025);
    expect(taxable).toBe(0);
  });

  it('one dollar over the first threshold starts taxing at 50 cents on the dollar', () => {
    const at = taxableSocialSecurity(ssBenefits, 12_000, 'mfj', FEDERAL_TAX_TABLES_2025);
    const over = taxableSocialSecurity(ssBenefits, 12_001, 'mfj', FEDERAL_TAX_TABLES_2025);
    expect(over - at).toBeCloseTo(0.5, 5);
  });

  it('caps at 85% of benefits for high provisional income', () => {
    const taxable = taxableSocialSecurity(ssBenefits, 500_000, 'mfj', FEDERAL_TAX_TABLES_2025);
    expect(taxable).toBeCloseTo(0.85 * ssBenefits, 5);
  });

  it('transitions from the 50% tier to the 85% tier at the second threshold', () => {
    // provisional = 44,000 exactly -> boundary
    const otherIncomeAtBoundary = 44_000 - ssBenefits / 2;
    const atBoundary = taxableSocialSecurity(ssBenefits, otherIncomeAtBoundary, 'mfj', FEDERAL_TAX_TABLES_2025);
    const justOver = taxableSocialSecurity(ssBenefits, otherIncomeAtBoundary + 1, 'mfj', FEDERAL_TAX_TABLES_2025);
    // Marginal rate jumps from $0.50/$ to $0.85/$ crossing this boundary.
    expect(justOver - atBoundary).toBeCloseTo(0.85, 5);
  });

  it('a Roth conversion (as "other income") increases SS taxability — the torpedo effect', () => {
    const withoutConversion = taxableSocialSecurity(ssBenefits, 20_000, 'mfj', FEDERAL_TAX_TABLES_2025);
    const withConversion = taxableSocialSecurity(ssBenefits, 40_000, 'mfj', FEDERAL_TAX_TABLES_2025);
    expect(withConversion).toBeGreaterThan(withoutConversion);
  });

  it('never taxes more than the benefits received', () => {
    const taxable = taxableSocialSecurity(ssBenefits, 10_000_000, 'mfj', FEDERAL_TAX_TABLES_2025);
    expect(taxable).toBeLessThanOrEqual(ssBenefits);
  });
});

describe('taxableSocialSecurity (single)', () => {
  it('uses the single-filer thresholds, not MFJ', () => {
    const ssBenefits = 20_000;
    // Single first threshold is $25,000, well below MFJ's $32,000.
    const taxable = taxableSocialSecurity(ssBenefits, 20_000, 'single', FEDERAL_TAX_TABLES_2025);
    expect(taxable).toBeGreaterThan(0);
  });
});
