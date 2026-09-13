import type { SpouseInput } from './projectionTypes';

const FULL_RETIREMENT_AGE = 67; // simplified: treated as 67 for every birth year in v1, not birth-year-dependent

/**
 * Early/delayed claiming adjustment factor relative to the benefit at full
 * retirement age. Simplified SSA formula: -5/9% per month for the first 36
 * months early, -5/12% per month beyond that (down to age 62); +2/3% per
 * month delayed, up to age 70.
 */
export function claimingAdjustmentFactor(claimingAge: number): number {
  const monthsFromFra = (claimingAge - FULL_RETIREMENT_AGE) * 12;
  if (monthsFromFra >= 0) {
    const cappedMonths = Math.min(monthsFromFra, (70 - FULL_RETIREMENT_AGE) * 12);
    return 1 + cappedMonths * (2 / 3 / 100);
  }
  const monthsEarly = Math.min(-monthsFromFra, (FULL_RETIREMENT_AGE - 62) * 12);
  const first36 = Math.min(monthsEarly, 36);
  const remaining = Math.max(0, monthsEarly - 36);
  const reduction = first36 * (5 / 9 / 100) + remaining * (5 / 12 / 100);
  return 1 - reduction;
}

/**
 * This spouse's annual SS benefit in `year`, in that year's nominal
 * dollars (ssBenefitAtFRA is treated as a today's-dollars input, inflated
 * forward from startYear — matches the engine's nominal-internally
 * convention, see BRACKETEER_BUILD_PLAN.md/requirements section 6).
 * $0 before the claiming age or after death.
 */
export function spouseAnnualBenefit(
  spouse: SpouseInput,
  year: number,
  startYear: number,
  generalInflationAssumption: number
): number {
  const age = year - spouse.birthYear;
  if (spouse.assumedDeathYear !== undefined && year > spouse.assumedDeathYear) return 0;
  if (age < spouse.ssClaimingAge) return 0;

  const factor = claimingAdjustmentFactor(spouse.ssClaimingAge);
  const inflationFactor = Math.pow(1 + generalInflationAssumption, Math.max(0, year - startYear));
  return spouse.ssBenefitAtFRA * factor * inflationFactor;
}

/**
 * Household SS income for a year: both spouses' benefits while both are
 * alive; the survivor gets the LARGER of the two adjusted benefits (a
 * simplified but standard-shaped survivor-benefit rule), the smaller ends,
 * once one spouse has died — the mechanism behind the widow's penalty
 * modeling more spending surviving on less filing-status room.
 */
export function householdSocialSecurityBenefit(
  spouses: [SpouseInput, SpouseInput],
  year: number,
  startYear: number,
  generalInflationAssumption: number
): number {
  const aliveA = spouses[0].assumedDeathYear === undefined || year <= spouses[0].assumedDeathYear;
  const aliveB = spouses[1].assumedDeathYear === undefined || year <= spouses[1].assumedDeathYear;

  if (aliveA && aliveB) {
    return (
      spouseAnnualBenefit(spouses[0], year, startYear, generalInflationAssumption) +
      spouseAnnualBenefit(spouses[1], year, startYear, generalInflationAssumption)
    );
  }

  if (!aliveA && !aliveB) return 0;

  // One spouse has died: the survivor steps up to the LARGER of the two
  // benefits (what each would have received had death not zeroed theirs
  // out) — compare hypothetical amounts, not spouseAnnualBenefit's
  // already-death-zeroed value for the deceased spouse.
  const survivor = aliveA ? spouses[0] : spouses[1];
  const deceased = aliveA ? spouses[1] : spouses[0];
  const survivorOwnBenefit = spouseAnnualBenefit(
    { ...survivor, assumedDeathYear: undefined },
    year,
    startYear,
    generalInflationAssumption
  );
  const deceasedHypotheticalBenefit = spouseAnnualBenefit(
    { ...deceased, assumedDeathYear: undefined },
    year,
    startYear,
    generalInflationAssumption
  );
  // The survivor must actually have reached their own claiming eligibility to receive anything.
  const survivorEligible = year - survivor.birthYear >= survivor.ssClaimingAge;
  if (!survivorEligible) return 0;
  return Math.max(survivorOwnBenefit, deceasedHypotheticalBenefit);
}
