import type { StateTaxInput, StateTaxModule, StateTaxResult } from '../types';

/**
 * Minnesota tax module — the only real (non-flat-rate) state implementation
 * in v1. See ROTH_PLANNER_V1_REQUIREMENTS.md section 3.4 and
 * BRACKETEER_BUILD_PLAN.md Phase 2 for the full spec:
 *
 *   - Starts from federal AGI.
 *   - Four brackets: 5.35% / 6.80% / 7.85% / 9.85%.
 *   - Capital gains taxed as ordinary income — no state 0% LTCG equivalent.
 *   - A Social Security subtraction that phases out by income.
 *   - Its own standard deduction, phased down at higher incomes.
 *   - No IRMAA-equivalent state surcharge.
 *
 * NOT YET IMPLEMENTED. This is a placeholder that throws rather than
 * silently returning a wrong number — Minnesota's actual bracket
 * thresholds, the SS subtraction formula, and the standard-deduction
 * phase-down must be verified against MN Department of Revenue
 * publications and stored as versioned data (like the federal tables)
 * before this can compute anything real. Wiring this up is Phase 2 of the
 * build plan, not part of the Phase 0 scaffold.
 */
export function createMinnesotaTaxModule(): StateTaxModule {
  return {
    stateCode: 'MN',
    computeStateTax(_input: StateTaxInput): StateTaxResult {
      throw new Error(
        'MinnesotaTaxModule is not implemented yet (Phase 2) — bracket/subtraction/' +
          'deduction figures must be verified against MN DOR and added as versioned ' +
          'data before this module can compute a real result.'
      );
    },
  };
}
