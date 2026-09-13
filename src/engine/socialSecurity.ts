import type { FilingStatus, TaxYearTables } from './types';

/**
 * The taxable portion of Social Security benefits under the provisional-
 * income formula (never more than 85% of benefits, per IRC 86). This is
 * the piece that makes federal tax a fixed-point problem rather than a sum
 * of independent parts: provisional income includes half of SS benefits
 * plus OTHER income (including any Roth conversion), so the conversion
 * amount changes how much SS itself gets taxed — see
 * BRACKETEER_BUILD_PLAN.md Phase 1b.
 */
export function taxableSocialSecurity(
  ssBenefits: number,
  otherIncome: number,
  filingStatus: FilingStatus,
  tables: TaxYearTables
): number {
  if (ssBenefits <= 0) return 0;

  const provisionalIncome = otherIncome + ssBenefits / 2;
  const firstThreshold = tables.socialSecurity.firstThreshold[filingStatus];
  const secondThreshold = tables.socialSecurity.secondThreshold[filingStatus];

  if (provisionalIncome <= firstThreshold) {
    return 0;
  }

  if (provisionalIncome <= secondThreshold) {
    const amountOverFirst = provisionalIncome - firstThreshold;
    return Math.min(0.5 * amountOverFirst, 0.85 * ssBenefits);
  }

  const amountOverSecond = provisionalIncome - secondThreshold;
  const tier1Taxable = Math.min(0.5 * (secondThreshold - firstThreshold), 0.5 * ssBenefits);
  const taxable = tier1Taxable + 0.85 * amountOverSecond;
  return Math.min(taxable, 0.85 * ssBenefits);
}
