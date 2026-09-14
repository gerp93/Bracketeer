import type { FilingStatus, StateTaxInput, StateTaxModule, StateTaxResult } from '../types';
import { taxOnAmount } from '../bracketMath';
import {
  MN_BRACKETS_2025,
  MN_STANDARD_DEDUCTION_BASE_2025,
  MN_STANDARD_DEDUCTION_PHASEOUT_START_2025,
  MN_STANDARD_DEDUCTION_PHASEOUT_RATE,
  MN_STANDARD_DEDUCTION_FLOOR_FRACTION,
  MN_SS_SUBTRACTION_MAX_2025,
  MN_SS_SUBTRACTION_PHASEOUT_START_2025,
  MN_SS_SUBTRACTION_PHASEOUT_RATE,
} from '../data/minnesotaTaxTables';

/**
 * Minnesota tax module — the only real (non-flat-rate) state
 * implementation in v1. See ROTH_PLANNER_V1_REQUIREMENTS.md section 3.4
 * and BRACKETEER_BUILD_PLAN.md Phase 2 for the full spec.
 *
 * Structural notes (what makes MN a meaningfully harder case than a
 * no-income-tax state, which is why it was worth building for real):
 *   - Starts from federal AGI, not federal taxable income.
 *   - Capital gains are taxed as ordinary income — there is no MN
 *     equivalent of the federal 0%/15% LTCG stacking benefit.
 *   - The standard deduction phases DOWN at higher incomes (unlike the
 *     flat federal one), so a large conversion can shrink it.
 *   - The Social Security subtraction phases out by income — a conversion
 *     can push the household off it entirely, an extra marginal spike on
 *     top of the federal SS torpedo (taxableSocialSecurity in
 *     socialSecurity.ts handles the federal side; this handles MN's own
 *     subtraction on top of the federal-taxable amount it's given).
 *
 * Uses this year's tables regardless of `input.year` for now (single
 * hardcoded 2025 table, no year-projection yet) — TODO once a second MN
 * tax year is added: mirror federalTaxTables.ts's projectTaxYearTables
 * pattern here too.
 */
export function createMinnesotaTaxModule(): StateTaxModule {
  return {
    stateCode: 'MN',
    computeStateTax(input: StateTaxInput): StateTaxResult {
      const notes: string[] = [];

      const standardDeduction = computeMnStandardDeduction(input.federalAgi, input.filingStatus);
      const ssSubtraction = computeMnSsSubtraction(
        input.federalAgi,
        input.socialSecurityBenefits,
        input.filingStatus,
        notes
      );

      // MN taxes capital gains as ordinary income — no separate stacking
      // logic needed, unlike the federal LTCG treatment.
      const stateTaxableIncome = Math.max(
        0,
        input.federalAgi - standardDeduction - ssSubtraction
      );

      const brackets = MN_BRACKETS_2025[input.filingStatus];
      const stateTax = taxOnAmount(stateTaxableIncome, brackets);

      return { stateTaxableIncome, stateTax, notes };
    },
  };
}

function computeMnStandardDeduction(federalAgi: number, filingStatus: FilingStatus): number {
  const base = MN_STANDARD_DEDUCTION_BASE_2025[filingStatus];
  const phaseoutStart = MN_STANDARD_DEDUCTION_PHASEOUT_START_2025[filingStatus];
  if (federalAgi <= phaseoutStart) return base;

  const reduction = (federalAgi - phaseoutStart) * MN_STANDARD_DEDUCTION_PHASEOUT_RATE;
  const floor = base * MN_STANDARD_DEDUCTION_FLOOR_FRACTION;
  return Math.max(floor, base - reduction);
}

function computeMnSsSubtraction(
  federalAgi: number,
  ssBenefits: number,
  filingStatus: FilingStatus,
  notes: string[]
): number {
  if (ssBenefits <= 0) return 0;

  const maxSubtraction = Math.min(MN_SS_SUBTRACTION_MAX_2025[filingStatus], ssBenefits);
  const phaseoutStart = MN_SS_SUBTRACTION_PHASEOUT_START_2025[filingStatus];

  if (federalAgi <= phaseoutStart) return maxSubtraction;

  const reduction = (federalAgi - phaseoutStart) * MN_SS_SUBTRACTION_PHASEOUT_RATE[filingStatus];
  const subtraction = Math.max(0, maxSubtraction - reduction);

  if (subtraction < maxSubtraction) {
    notes.push(
      subtraction === 0
        ? "MN Social Security subtraction is fully phased out at this income — increasing income further has no additional subtraction to lose, but crossing this line for the first time was itself a marginal-rate spike."
        : 'MN Social Security subtraction is partially phased out at this income — a further increase loses $0.10 of subtraction per dollar, stacking on top of the federal SS torpedo.'
    );
  }

  return subtraction;
}
