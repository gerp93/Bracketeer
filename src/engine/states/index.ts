import type { StateTaxModule } from '../types';
import { createFlatRateState } from './flatRateState';
import { createMinnesotaTaxModule } from './minnesotaTax';

/**
 * Resolve a state code to its tax module. Minnesota is the only real
 * implementation; every other state gets the flat-rate fallback with a
 * user-supplied rate (default 0 until the caller sets one) — see
 * ROTH_PLANNER_V1_REQUIREMENTS.md section 3.4.
 */
export function resolveStateTaxModule(stateCode: string, flatRateFallback = 0): StateTaxModule {
  if (stateCode.toUpperCase() === 'MN') {
    return createMinnesotaTaxModule();
  }
  return createFlatRateState(stateCode, flatRateFallback);
}
