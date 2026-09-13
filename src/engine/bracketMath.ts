import type { Bracket } from './types';

/** Tax owed on `amount` of taxable income under a progressive bracket schedule. */
export function taxOnAmount(amount: number, brackets: Bracket[]): number {
  if (amount <= 0) return 0;
  let tax = 0;
  for (const b of brackets) {
    const top = b.to ?? Infinity;
    if (amount <= b.from) break;
    const taxableInThisBracket = Math.min(amount, top) - b.from;
    if (taxableInThisBracket > 0) tax += taxableInThisBracket * b.rate;
  }
  return tax;
}

/** The marginal rate that would apply to the next dollar at `amount`. */
export function marginalRateAt(amount: number, brackets: Bracket[]): number {
  for (const b of brackets) {
    const top = b.to ?? Infinity;
    if (amount >= b.from && amount < top) return b.rate;
  }
  return brackets[brackets.length - 1]?.rate ?? 0;
}

/** Dollars of headroom before `amount` crosses into the next bracket. Undefined if already in the top bracket. */
export function headroomToNextBracket(amount: number, brackets: Bracket[]): number | undefined {
  const sorted = [...brackets].sort((a, b) => a.from - b.from);
  for (const b of sorted) {
    const top = b.to ?? Infinity;
    if (amount >= b.from && amount < top) {
      return top === Infinity ? undefined : top - amount;
    }
  }
  return undefined;
}

/**
 * Stack `stackedAmount` (e.g. LTCG) on top of `baseAmount` (e.g. ordinary
 * income) against a shared bracket schedule, taxing only the stacked
 * portion — i.e. the amount from baseAmount to baseAmount+stackedAmount.
 * This is how LTCG "stacks on top of" ordinary income for both federal
 * LTCG brackets and Minnesota's ordinary treatment of gains.
 */
export function taxOnStackedAmount(baseAmount: number, stackedAmount: number, brackets: Bracket[]): number {
  if (stackedAmount <= 0) return 0;
  return taxOnAmount(baseAmount + stackedAmount, brackets) - taxOnAmount(baseAmount, brackets);
}

/** Headroom in the stacked portion before crossing to the next bracket, given what's already stacked below it. */
export function headroomInStack(baseAmount: number, stackedAmount: number, brackets: Bracket[]): number | undefined {
  return headroomToNextBracket(baseAmount + stackedAmount, brackets);
}
