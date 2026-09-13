import { describe, it, expect } from 'vitest';
import { computeIrmaa, headroomToNextIrmaaTier } from './irmaa';
import { FEDERAL_TAX_TABLES_2025 } from './data/federalTaxTables';

describe('computeIrmaa (MFJ, two people covered)', () => {
  it('is $0 below the first tier', () => {
    const result = computeIrmaa(200_000, 'mfj', FEDERAL_TAX_TABLES_2025, 2);
    expect(result.annualSurchargeTotal).toBe(0);
  });

  it('is a true cliff: one dollar over the tier boundary changes the whole surcharge, not a smooth ramp', () => {
    const justUnder = computeIrmaa(205_999, 'mfj', FEDERAL_TAX_TABLES_2025, 2);
    const atTier = computeIrmaa(206_000, 'mfj', FEDERAL_TAX_TABLES_2025, 2);
    expect(justUnder.annualSurchargeTotal).toBe(0);
    expect(atTier.annualSurchargeTotal).toBeGreaterThan(0);
    // The jump is the full tier's surcharge, not a fraction of it — the defining property of a cliff.
    expect(atTier.annualSurchargeTotal).toBeCloseTo((74.0 + 13.7) * 12 * 2, 2);
  });

  it('applies the surcharge per covered person', () => {
    const forOne = computeIrmaa(210_000, 'mfj', FEDERAL_TAX_TABLES_2025, 1);
    const forTwo = computeIrmaa(210_000, 'mfj', FEDERAL_TAX_TABLES_2025, 2);
    expect(forTwo.annualSurchargeTotal).toBeCloseTo(forOne.annualSurchargeTotal * 2, 2);
  });

  it('reaches the top tier for very high MAGI', () => {
    const result = computeIrmaa(2_000_000, 'mfj', FEDERAL_TAX_TABLES_2025, 2);
    expect(result.partBMonthlySurchargePerPerson).toBe(443.9);
  });
});

describe('computeIrmaa (single) uses single-filer tiers, not half of MFJ', () => {
  it('single tier boundaries are lower than MFJ, not simply MFJ/2 in every case', () => {
    const single = computeIrmaa(150_000, 'single', FEDERAL_TAX_TABLES_2025, 1);
    const mfj = computeIrmaa(150_000, 'mfj', FEDERAL_TAX_TABLES_2025, 1);
    // $150k triggers a mid tier for a single filer but is still under MFJ's first tier ($206k) —
    // this is the widow's-penalty mechanism: same income, single filer pays IRMAA, MFJ doesn't.
    expect(single.annualSurchargeTotal).toBeGreaterThan(0);
    expect(mfj.annualSurchargeTotal).toBe(0);
  });
});

describe('headroomToNextIrmaaTier', () => {
  it('is exact at the dollar', () => {
    expect(headroomToNextIrmaaTier(205_900, 'mfj', FEDERAL_TAX_TABLES_2025)).toBe(100);
  });

  it('is undefined in the top tier', () => {
    expect(headroomToNextIrmaaTier(5_000_000, 'mfj', FEDERAL_TAX_TABLES_2025)).toBeUndefined();
  });
});
