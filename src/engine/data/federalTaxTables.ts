import type { Bracket, FilingStatus, IrmaaTier, TaxYearTables } from '../types';

// 2025 federal tax year. Originally sourced from IRS Revenue Procedure
// 2024-40 (published Oct. 2024, the standard annual inflation adjustment).
// The One Big Beautiful Bill Act (OBBBA, signed July 2025) then RETROACTIVELY
// revised several 2025-tax-year figures after that Rev. Proc. was already
// published — most notably the standard deduction. Figures below marked
// "(2026-09 verified)" were cross-checked against current sources on that
// date and updated where OBBBA changed them; unmarked figures still reflect
// the original Rev. Proc. 2024-40 numbers and have NOT been independently
// re-verified against OBBBA's changes — see TODO.md.
//
// SS provisional-income thresholds and the NIIT threshold are NOT
// inflation-indexed by statute and have been fixed since enactment.

// MFJ (2026-09 verified): top bracket confirmed directly against IRS.gov's
// own 2025 adjustments release ($751,600); the other five breakpoints are
// exactly double the independently-sourced 2025 MFS breakpoints (MFS is
// statutorily half of MFJ at every breakpoint — see mfsOrdinary2025 below),
// which cross-validates against that same confirmed top figure exactly.
const mfjOrdinary2025: Bracket[] = [
  { from: 0, to: 23_850, rate: 0.1 },
  { from: 23_850, to: 96_950, rate: 0.12 },
  { from: 96_950, to: 206_700, rate: 0.22 },
  { from: 206_700, to: 394_600, rate: 0.24 },
  { from: 394_600, to: 501_050, rate: 0.32 },
  { from: 501_050, to: 751_600, rate: 0.35 },
  { from: 751_600, rate: 0.37 },
];

// Single — only the top breakpoint is 2026-09 verified (confirmed directly
// against IRS.gov: $626,350). The other five breakpoints below are NOT
// independently re-verified against OBBBA's changes and may be similarly
// stale — flagged in TODO.md rather than guessed at here.
const singleOrdinary2025: Bracket[] = [
  { from: 0, to: 11_600, rate: 0.1 },
  { from: 11_600, to: 47_150, rate: 0.12 },
  { from: 47_150, to: 100_525, rate: 0.22 },
  { from: 100_525, to: 191_950, rate: 0.24 },
  { from: 191_950, to: 243_725, rate: 0.32 },
  { from: 243_725, to: 626_350, rate: 0.35 },
  { from: 626_350, rate: 0.37 },
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

/**
 * MFS brackets are, by IRS design, exactly half of MFJ's at every single
 * threshold (verified against the 2025 MFJ top bracket: $751,600 per IRS's
 * own 2025 inflation-adjustment release, exactly double the independently-
 * sourced 2025 MFS top bracket of $375,800) — derived here from the MFJ
 * arrays above rather than hand-typed, so it can never drift from whatever
 * MFJ figures this file holds, and the relationship is explicit rather than
 * a second set of numbers someone has to trust matches.
 */
function halveBrackets(brackets: Bracket[]): Bracket[] {
  return brackets.map((b) => ({
    from: b.from / 2,
    to: b.to !== undefined ? b.to / 2 : undefined,
    rate: b.rate,
  }));
}

const mfsOrdinary2025: Bracket[] = halveBrackets(mfjOrdinary2025);
const mfsLtcg2025: Bracket[] = halveBrackets(mfjLtcg2025);

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

// MFS is famously a cliff, not a staircase: only 2 tiers (vs 5 for
// MFJ/single) — the surcharge jumps straight from $0 to the near-top tier
// at $106,000 MAGI, then to the true top tier at $394,000. The dollar
// surcharge amounts at each MFS tier reuse the exact figures already in
// irmaaPartBMfj2025/irmaaPartDMfj2025's own 4th and 6th tiers (406.9/443.9
// and 78.6/85.8) — CMS sets one surcharge dollar amount per tier, shared
// across every filing status; only the MAGI thresholds that reach each
// tier differ by status.
const irmaaPartBMfs2025: IrmaaTier[] = [
  { magiFrom: 0, magiTo: 106_000, monthlySurchargePerPerson: 0 },
  { magiFrom: 106_000, magiTo: 394_000, monthlySurchargePerPerson: 406.9 },
  { magiFrom: 394_000, monthlySurchargePerPerson: 443.9 },
];

const irmaaPartDMfs2025: IrmaaTier[] = [
  { magiFrom: 0, magiTo: 106_000, monthlySurchargePerPerson: 0 },
  { magiFrom: 106_000, magiTo: 394_000, monthlySurchargePerPerson: 78.6 },
  { magiFrom: 394_000, monthlySurchargePerPerson: 85.8 },
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
  ordinaryBrackets: { mfj: mfjOrdinary2025, single: singleOrdinary2025, mfs: mfsOrdinary2025 },
  // MFS's standard deduction equals single's exactly, always, by statute —
  // reuses that same figure rather than a second hand-typed copy.
  // 2026-09 verified: OBBBA (signed July 2025) raised these from the
  // original Rev. Proc. 2024-40 figures ($30,000/$15,000) to $31,500/
  // $15,750, permanently, effective for the 2025 tax year itself —
  // confirmed against two independent current sources.
  standardDeduction: { mfj: 31_500, single: 15_750, mfs: 15_750 },
  // 2025 additional amount for 65+: $1,550 per qualifying spouse (MFJ),
  // $1,950 (single) — NOT independently re-verified against OBBBA's
  // changes (OBBBA also added a separate, new $6,000-per-senior bonus
  // deduction on top of this one, which Bracketeer does not yet model at
  // all — see TODO.md). Stored here as the single-filer figure since that's
  // the status the addition actually applies per-person to; the MFJ
  // household-level addition is `additionalStandardDeduction65PlusMfjPerSpouse`
  // handled in federalTax.ts (kept out of this simple per-status record).
  additionalStandardDeduction65Plus: 1_950,
  ltcgBrackets: { mfj: mfjLtcg2025, single: singleLtcg2025, mfs: mfsLtcg2025 },
  socialSecurity: {
    // MFS is a deliberate special case, not a smaller version of MFJ/single:
    // a taxpayer filing separately who lived with their spouse at any point
    // in the year gets a $0 base amount — provisional income is taxed from
    // the very first dollar, capped at the same 85% ceiling as everyone
    // else. Bracketeer assumes the common case (spouses lived together at
    // some point) rather than adding a UI toggle for the rarer
    // lived-apart-all-year case, which reuses single's thresholds instead.
    firstThreshold: { mfj: 32_000, single: 25_000, mfs: 0 },
    secondThreshold: { mfj: 44_000, single: 34_000, mfs: 0 },
  },
  // Statutory, unindexed since 2013. $125,000 is exactly half of MFJ's
  // $250,000 (not a coincidence — NIIT's MFS threshold is defined as half
  // of MFJ's, same relationship as the bracket thresholds above).
  niitThreshold: { mfj: 250_000, single: 200_000, mfs: 125_000 },
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
  if (filingStatus === 'mfs') return part === 'partB' ? irmaaPartBMfs2025 : irmaaPartDMfs2025;
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
      mfs: inflateBrackets(baseTables.ordinaryBrackets.mfs),
    },
    standardDeduction: {
      mfj: round(baseTables.standardDeduction.mfj * factor),
      single: round(baseTables.standardDeduction.single * factor),
      mfs: round(baseTables.standardDeduction.mfs * factor),
    },
    additionalStandardDeduction65Plus: round(baseTables.additionalStandardDeduction65Plus * factor),
    ltcgBrackets: {
      mfj: inflateBrackets(baseTables.ltcgBrackets.mfj),
      single: inflateBrackets(baseTables.ltcgBrackets.single),
      mfs: inflateBrackets(baseTables.ltcgBrackets.mfs),
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
