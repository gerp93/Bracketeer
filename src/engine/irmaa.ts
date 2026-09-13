import type { FilingStatus, IrmaaTier, TaxYearTables } from './types';
import { irmaaTiersByFilingStatus } from './data/federalTaxTables';

export interface IrmaaResult {
  partBMonthlySurchargePerPerson: number;
  partDMonthlySurchargePerPerson: number;
  annualSurchargeTotal: number;
  tierMagiFrom: number;
  tierMagiTo?: number;
}

/**
 * IRMAA for a given year is keyed to MAGI from TWO YEARS PRIOR, not the
 * current year's MAGI — a conversion's Medicare cost lands two years
 * later, not in the conversion year. Callers must pass the MAGI from
 * (year - 2), which is why the projection engine carries a MAGI history
 * (BRACKETEER_BUILD_PLAN.md Phase 3). This function itself is a pure
 * lookup and does not know about "this year" vs "two years ago" — that's
 * the caller's responsibility, kept explicit rather than hidden in here.
 */
export function computeIrmaa(
  magiTwoYearsPrior: number,
  filingStatus: FilingStatus,
  tables: TaxYearTables,
  coveredPersonCount: 1 | 2
): IrmaaResult {
  const partBTiers = irmaaTiersByFilingStatus(tables, filingStatus, 'partB');
  const partDTiers = irmaaTiersByFilingStatus(tables, filingStatus, 'partD');

  const partBTier = findTier(magiTwoYearsPrior, partBTiers);
  const partDTier = findTier(magiTwoYearsPrior, partDTiers);

  const partB = partBTier.monthlySurchargePerPerson;
  const partD = partDTier.monthlySurchargePerPerson;

  return {
    partBMonthlySurchargePerPerson: partB,
    partDMonthlySurchargePerPerson: partD,
    annualSurchargeTotal: (partB + partD) * 12 * coveredPersonCount,
    tierMagiFrom: partBTier.magiFrom,
    tierMagiTo: partBTier.magiTo,
  };
}

function findTier(magi: number, tiers: IrmaaTier[]): IrmaaTier {
  const sorted = [...tiers].sort((a, b) => a.magiFrom - b.magiFrom);
  let match = sorted[0];
  for (const t of sorted) {
    if (magi >= t.magiFrom) match = t;
  }
  return match;
}

/** Dollars of MAGI headroom before the next IRMAA tier, or undefined if already in the top tier. */
export function headroomToNextIrmaaTier(
  magi: number,
  filingStatus: FilingStatus,
  tables: TaxYearTables
): number | undefined {
  const tiers = irmaaTiersByFilingStatus(tables, filingStatus, 'partB');
  const sorted = [...tiers].sort((a, b) => a.magiFrom - b.magiFrom);
  const current = findTier(magi, sorted);
  return current.magiTo === undefined ? undefined : current.magiTo - magi;
}
