import type { Bracket, FilingStatus, IrmaaTier, TaxYearTables } from '../types';

// 2025 federal tax year, the newest year with enacted figures at the time
// this table was written. Per BRACKETEER_BUILD_PLAN.md Phase 1: these
// numbers should be spot-checked against the IRS's own published Rev.
// Proc. before this app is relied on for a real decision — see TODO.md.
// SS provisional-income thresholds and the NIIT threshold are NOT
// inflation-indexed by statute and have been fixed since enactment; every
// other indexed figure here is a real, enacted 2025 number.

const mfjOrdinary2025: Bracket[] = [
  { from: 0, to: 23_200, rate: 0.1 },
  { from: 23_200, to: 94_300, rate: 0.12 },
  { from: 94_300, to: 201_050, rate: 0.22 },
  { from: 201_050, to: 383_900, rate: 0.24 },
  { from: 383_900, to: 487_450, rate: 0.32 },
  { from: 487_450, to: 731_200, rate: 0.35 },
  { from: 731_200, rate: 0.37 },
];

const singleOrdinary2025: Bracket[] = [
  { from: 0, to: 11_600, rate: 0.1 },
  { from: 11_600, to: 47_150, rate: 0.12 },
  { from: 47_150, to: 100_525, rate: 0.22 },
  { from: 100_525, to: 191_950, rate: 0.24 },
  { from: 191_950, to: 243_725, rate: 0.32 },
  { from: 243_725, to: 609_350, rate: 0.35 },
  { from: 609_350, rate: 0.37 },
];

const mfjLtcg2025: Bracket[] = [
  { from: 0, to: 96_700, rate: 0 },
  { from: 96_700, to: 600_050, rate: 0.15 },
  { from: 600_050, rate: 0.2 },
];

const singleLtcg2025: Bracket[] = [
  { from: 0, to: 48_350, rate: 0 },
  { from: 48_350, to: 533_400, rate: 0.15 },
  { from: 533_400, rate: 0.2 },
];

// IRMAA tiers are keyed to MAGI from two years prior (see federalTax.ts's
// projection-lookback handling) — these are the tier boundaries as they'd
// apply to a given base year's MAGI, not literally "this year's" numbers.
const irmaaPartBMfj2025: IrmaaTier[] = [
  { magiFrom: 0, magiTo: 206_000, monthlySurchargePerPerson: 0 },
  { magiFrom: 206_000, magiTo: 258_000, monthlySurchargePerPerson: 74.0 },
  { magiFrom: 258_000, magiTo: 322_000, monthlySurchargePerPerson: 185.0 },
  { magiFrom: 322_000, magiTo: 386_000, monthlySurchargePerPerson: 295.9 },
  { magiFrom: 386_000, magiTo: 750_000, monthlySurchargePerPerson: 406.9 },
  { magiFrom: 750_000, monthlySurchargePerPerson: 443.9 },
];

const irmaaPartDMfj2025: IrmaaTier[] = [
  { magiFrom: 0, magiTo: 206_000, monthlySurchargePerPerson: 0 },
  { magiFrom: 206_000, magiTo: 258_000, monthlySurchargePerPerson: 13.7 },
  { magiFrom: 258_000, magiTo: 322_000, monthlySurchargePerPerson: 35.3 },
  { magiFrom: 322_000, magiTo: 386_000, monthlySurchargePerPerson: 57.0 },
  { magiFrom: 386_000, magiTo: 750_000, monthlySurchargePerPerson: 78.6 },
  { magiFrom: 750_000, monthlySurchargePerPerson: 85.8 },
];

const irmaaPartBSingle2025: IrmaaTier[] = [
  { magiFrom: 0, magiTo: 103_000, monthlySurchargePerPerson: 0 },
  { magiFrom: 103_000, magiTo: 129_000, monthlySurchargePerPerson: 74.0 },
  { magiFrom: 129_000, magiTo: 161_000, monthlySurchargePerPerson: 185.0 },
  { magiFrom: 161_000, magiTo: 193_000, monthlySurchargePerPerson: 295.9 },
  { magiFrom: 193_000, magiTo: 500_000, monthlySurchargePerPerson: 406.9 },
  { magiFrom: 500_000, monthlySurchargePerPerson: 443.9 },
];

const irmaaPartDSingle2025: IrmaaTier[] = [
  { magiFrom: 0, magiTo: 103_000, monthlySurchargePerPerson: 0 },
  { magiFrom: 103_000, magiTo: 129_000, monthlySurchargePerPerson: 13.7 },
  { magiFrom: 129_000, magiTo: 161_000, monthlySurchargePerPerson: 35.3 },
  { magiFrom: 161_000, magiTo: 193_000, monthlySurchargePerPerson: 57.0 },
  { magiFrom: 193_000, magiTo: 500_000, monthlySurchargePerPerson: 78.6 },
  { magiFrom: 500_000, monthlySurchargePerPerson: 85.8 },
];

// IRS Uniform Lifetime Table (Pub. 590-B, effective 2022+), age -> divisor.
export const RMD_UNIFORM_LIFETIME_TABLE: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0,
  79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0,
  86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8,
  93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4,
};

export const FEDERAL_TAX_TABLES_2025: TaxYearTables = {
  year: 2025,
  status: 'actual',
  ordinaryBrackets: { mfj: mfjOrdinary2025, single: singleOrdinary2025 },
  standardDeduction: { mfj: 30_000, single: 15_000 },
  // 2025 additional amount for 65+: $1,550 per qualifying spouse (MFJ),
  // $1,950 (single). Stored here as the single-filer figure since that's
  // the status the addition actually applies per-person to; the MFJ
  // household-level addition is `additionalStandardDeduction65PlusMfjPerSpouse`
  // handled in federalTax.ts (kept out of this simple per-status record).
  additionalStandardDeduction65Plus: 1_950,
  ltcgBrackets: { mfj: mfjLtcg2025, single: singleLtcg2025 },
  socialSecurity: {
    firstThreshold: { mfj: 32_000, single: 25_000 },
    secondThreshold: { mfj: 44_000, single: 34_000 },
  },
  niitThreshold: { mfj: 250_000, single: 200_000 },
  niitRate: 0.038,
  irmaa: {
    partB: irmaaPartBMfj2025, // default export kept MFJ-shaped; see byFilingStatus below
    partD: irmaaPartDMfj2025,
  },
  rmdUniformLifetimeTable: RMD_UNIFORM_LIFETIME_TABLE,
};

/** IRMAA tiers differ by filing status, unlike the single `irmaa` field on TaxYearTables (kept simple for the common MFJ case). */
export function irmaaTiersByFilingStatus(
  tables: TaxYearTables,
  filingStatus: FilingStatus,
  part: 'partB' | 'partD'
): IrmaaTier[] {
  if (filingStatus === 'mfj') return tables.irmaa[part];
  return part === 'partB' ? irmaaPartBSingle2025 : irmaaPartDSingle2025;
}

/** MFJ's 65+ standard deduction addition is per qualifying spouse, not a flat household amount. */
export const ADDITIONAL_STANDARD_DEDUCTION_65_PLUS_MFJ_PER_SPOUSE = 1_550;

const CPI_INFLATION_ASSUMPTION_DEFAULT = 0.025;

/**
 * Project a tax year's tables forward from the newest actual year by
 * inflating every indexed figure. NOT inflation-indexed by statute (left
 * untouched): SS provisional-income thresholds, the NIIT threshold. RMD
 * divisors are actuarial, not inflation-indexed, and also left untouched.
 */
export function projectTaxYearTables(
  baseTables: TaxYearTables,
  targetYear: number,
  annualInflation: number = CPI_INFLATION_ASSUMPTION_DEFAULT
): TaxYearTables {
  if (targetYear <= baseTables.year) {
    throw new Error(`projectTaxYearTables: targetYear (${targetYear}) must be after base year (${baseTables.year})`);
  }
  const years = targetYear - baseTables.year;
  const factor = Math.pow(1 + annualInflation, years);
  const inflateBracket = (b: Bracket): Bracket => ({
    from: round(b.from * factor),
    to: b.to !== undefined ? round(b.to * factor) : undefined,
    rate: b.rate,
  });
  const inflateBrackets = (bs: Bracket[]) => bs.map(inflateBracket);
  const inflateTier = (t: IrmaaTier): IrmaaTier => ({
    magiFrom: round(t.magiFrom * factor),
    magiTo: t.magiTo !== undefined ? round(t.magiTo * factor) : undefined,
    // Surcharge dollar amounts themselves also move with Medicare Part B/D
    // cost trend, which isn't the same as general CPI — approximated here
    // with the same inflation assumption for lack of a separate one.
    monthlySurchargePerPerson: round(t.monthlySurchargePerPerson * factor, 2),
  });

  return {
    year: targetYear,
    status: 'projected',
    ordinaryBrackets: {
      mfj: inflateBrackets(baseTables.ordinaryBrackets.mfj),
      single: inflateBrackets(baseTables.ordinaryBrackets.single),
    },
    standardDeduction: {
      mfj: round(baseTables.standardDeduction.mfj * factor),
      single: round(baseTables.standardDeduction.single * factor),
    },
    additionalStandardDeduction65Plus: round(baseTables.additionalStandardDeduction65Plus * factor),
    ltcgBrackets: {
      mfj: inflateBrackets(baseTables.ltcgBrackets.mfj),
      single: inflateBrackets(baseTables.ltcgBrackets.single),
    },
    socialSecurity: baseTables.socialSecurity, // NOT inflation-indexed by statute
    niitThreshold: baseTables.niitThreshold, // NOT inflation-indexed by statute
    niitRate: baseTables.niitRate,
    irmaa: {
      partB: baseTables.irmaa.partB.map(inflateTier),
      partD: baseTables.irmaa.partD.map(inflateTier),
    },
    rmdUniformLifetimeTable: baseTables.rmdUniformLifetimeTable, // actuarial, not inflation-indexed
  };
}

function round(n: number, decimals = 0): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
