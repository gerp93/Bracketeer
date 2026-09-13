import type { TaxYearTables } from './types';

/** SECURE 2.0's RMD starting age depends on birth year: 73 for those born 1951-1959, 75 for 1960+. */
export function rmdStartAge(birthYear: number): number {
  if (birthYear >= 1960) return 75;
  return 73;
}

export function isRmdRequired(age: number, birthYear: number): boolean {
  return age >= rmdStartAge(birthYear);
}

/** The required minimum distribution for a given traditional-account balance and age, or 0 if not yet required. */
export function computeRmd(
  traditionalBalanceAtYearStart: number,
  age: number,
  birthYear: number,
  tables: TaxYearTables
): number {
  if (!isRmdRequired(age, birthYear)) return 0;
  const divisor = tables.rmdUniformLifetimeTable[age] ?? tables.rmdUniformLifetimeTable[100];
  if (!divisor) return 0;
  return traditionalBalanceAtYearStart / divisor;
}
