import type { StateTaxInput, StateTaxModule, StateTaxResult } from '../types';

/**
 * Fallback for any state without a dedicated module: a single user-supplied
 * effective rate applied to federal AGI. Clearly an approximation — real
 * per-state logic (its own brackets, SS/capital-gains treatment, etc.)
 * belongs in a dedicated module like minnesotaTax.ts, not here.
 */
export function createFlatRateState(stateCode: string, flatRate: number): StateTaxModule {
  return {
    stateCode,
    computeStateTax(input: StateTaxInput): StateTaxResult {
      const stateTaxableIncome = Math.max(0, input.federalAgi);
      return {
        stateTaxableIncome,
        stateTax: stateTaxableIncome * flatRate,
        notes: [
          `${stateCode} has no dedicated Bracketeer tax module yet — this is a flat ${(flatRate * 100).toFixed(2)}% approximation on federal AGI, not real state law.`,
        ],
      };
    },
  };
}
