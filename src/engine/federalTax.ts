import type { TaxYearTables } from './types';

/**
 * The federal tax engine's entry point. NOT YET IMPLEMENTED — this is a
 * Phase 0 placeholder marking where Phase 1 (BRACKETEER_BUILD_PLAN.md)
 * lands: the ordered pipeline (ordinary income -> deductions -> SS
 * provisional inclusion -> LTCG stacking -> brackets -> NIIT -> RMD ->
 * pro-rata -> IRMAA lookback) documented there as a fixed-point problem,
 * not a simple sum of independent parts.
 *
 * Deliberately throws rather than returning a plausible-looking wrong
 * number for input this module doesn't actually compute yet.
 */
export function computeFederalTax(_tables: TaxYearTables, _input: unknown): never {
  throw new Error('computeFederalTax is not implemented yet — see BRACKETEER_BUILD_PLAN.md Phase 1.');
}
