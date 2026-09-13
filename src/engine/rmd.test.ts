import { describe, it, expect } from 'vitest';
import { computeRmd, isRmdRequired, rmdStartAge } from './rmd';
import { FEDERAL_TAX_TABLES_2025 } from './data/federalTaxTables';

describe('rmdStartAge', () => {
  it('is 73 for the 1951-1959 birth cohort', () => {
    expect(rmdStartAge(1955)).toBe(73);
  });
  it('is 75 for 1960+', () => {
    expect(rmdStartAge(1960)).toBe(75);
    expect(rmdStartAge(1970)).toBe(75);
  });
});

describe('isRmdRequired', () => {
  it('is false the year before the start age', () => {
    expect(isRmdRequired(72, 1955)).toBe(false);
  });
  it('is true starting at the start age', () => {
    expect(isRmdRequired(73, 1955)).toBe(true);
  });
});

describe('computeRmd', () => {
  it('is $0 before the start age regardless of balance', () => {
    expect(computeRmd(1_000_000, 70, 1960, FEDERAL_TAX_TABLES_2025)).toBe(0);
  });

  it('divides the balance by the Uniform Lifetime Table divisor at the start age', () => {
    const rmd = computeRmd(1_000_000, 75, 1960, FEDERAL_TAX_TABLES_2025);
    expect(rmd).toBeCloseTo(1_000_000 / 24.6, 2);
  });

  it('divisor shrinks (RMD fraction grows) with age', () => {
    const rmdAt75 = computeRmd(1_000_000, 75, 1955, FEDERAL_TAX_TABLES_2025);
    const rmdAt90 = computeRmd(1_000_000, 90, 1955, FEDERAL_TAX_TABLES_2025);
    expect(rmdAt90).toBeGreaterThan(rmdAt75);
  });
});
