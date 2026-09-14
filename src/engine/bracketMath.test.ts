import { describe, it, expect } from 'vitest';
import { taxOnAmount, marginalRateAt, headroomToNextBracket, taxOnStackedAmount } from './bracketMath';
import { FEDERAL_TAX_TABLES_2025 } from './data/federalTaxTables';

const mfj = FEDERAL_TAX_TABLES_2025.ordinaryBrackets.mfj;

describe('taxOnAmount', () => {
  it('taxes $0 as $0', () => {
    expect(taxOnAmount(0, mfj)).toBe(0);
  });

  it('one dollar under the 12% bracket edge is taxed entirely at 10%', () => {
    // 2025 MFJ: 10% bracket ends at $23,850.
    const tax = taxOnAmount(23_849, mfj);
    expect(tax).toBeCloseTo(23_849 * 0.1, 5);
  });

  it('one dollar over the bracket edge taxes only that dollar at the higher rate', () => {
    const at = taxOnAmount(23_850, mfj);
    const overBy1 = taxOnAmount(23_851, mfj);
    expect(overBy1 - at).toBeCloseTo(0.12, 5);
  });

  it('matches a hand-computed total in the 22% bracket', () => {
    // $150,000 MFJ 2025: 10% of 23,850 + 12% of (96,950-23,850) + 22% of (150,000-96,950)
    const expected = 23_850 * 0.1 + (96_950 - 23_850) * 0.12 + (150_000 - 96_950) * 0.22;
    expect(taxOnAmount(150_000, mfj)).toBeCloseTo(expected, 5);
  });

  it('top bracket has no upper bound', () => {
    const tax = taxOnAmount(2_000_000, mfj);
    expect(tax).toBeGreaterThan(0);
  });
});

describe('marginalRateAt', () => {
  it('reports the top bracket rate for very high income', () => {
    expect(marginalRateAt(5_000_000, mfj)).toBe(0.37);
  });

  it('reports the bottom rate at $0', () => {
    expect(marginalRateAt(0, mfj)).toBe(0.1);
  });

  it('flips exactly at a bracket edge', () => {
    expect(marginalRateAt(23_849, mfj)).toBe(0.1);
    expect(marginalRateAt(23_850, mfj)).toBe(0.12);
  });
});

describe('headroomToNextBracket', () => {
  it('is exact at the dollar', () => {
    expect(headroomToNextBracket(96_950 - 100, mfj)).toBe(100);
  });

  it('is undefined in the top bracket', () => {
    expect(headroomToNextBracket(5_000_000, mfj)).toBeUndefined();
  });
});

describe('taxOnStackedAmount', () => {
  const ltcg = FEDERAL_TAX_TABLES_2025.ltcgBrackets.mfj;

  it('stacked gains starting above the 0% LTCG ceiling are taxed at 15%', () => {
    // 2025 MFJ 0% LTCG ceiling: $96,700. Ordinary income already at 100k.
    const tax = taxOnStackedAmount(100_000, 10_000, ltcg);
    expect(tax).toBeCloseTo(10_000 * 0.15, 5);
  });

  it('stacked gains straddling the 0%/15% line are partially free', () => {
    // Ordinary income at 90,000 -> first 6,700 of gains free, rest at 15%.
    const tax = taxOnStackedAmount(90_000, 10_000, ltcg);
    const expected = 3_300 * 0.15; // (10,000 - 6,700) at 15%
    expect(tax).toBeCloseTo(expected, 5);
  });

  it('gains stacked entirely within the 0% bracket owe nothing', () => {
    const tax = taxOnStackedAmount(0, 50_000, ltcg);
    expect(tax).toBe(0);
  });
});
