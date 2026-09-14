/**
 * Citation metadata for every externally-sourced figure the engine uses —
 * deliberately kept separate from the actual tax tables (federalTaxTables.ts,
 * minnesotaTaxTables.ts) so the Data Sources UI can read the REAL live
 * values from those files directly rather than a second, hand-typed copy
 * that could drift from them. This file only adds where each figure came
 * from; it never duplicates a number.
 */

export interface Citation {
  source: string;
  locator?: string;
  url?: string;
}

/**
 * The last date any figure in federalTaxTables.ts/minnesotaTaxTables.ts
 * was added, corrected, or re-verified against an outside source — update
 * this by hand alongside any such change. A single top-level date, not a
 * claim that every individual figure was checked on this date; each
 * citation's own locator says whether that specific figure is verified.
 */
export const DATA_LAST_UPDATED = '2026-09-14';

export const CITATIONS: Record<string, Citation> = {
  federalOrdinaryBrackets: {
    source:
      'IRS Revenue Procedure 2024-40 (issued Oct. 2024 — IRS Revenue Procedures are always numbered by the year they’re issued, not the tax year they set; this one sets 2025’s figures), cross-checked against IRS.gov’s 2025 adjustments release',
    locator:
      'MFJ: 2026-09 verified (top bracket confirmed directly at $751,600; the other five breakpoints derived as exactly double the independently-confirmed 2025 MFS breakpoints). Single: only the top breakpoint ($626,350) is 2026-09 verified — the other five still reflect the original Rev. Proc. 2024-40 figures and have not been independently re-checked.',
    url: 'https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2025',
  },
  federalStandardDeduction: {
    source: 'One Big Beautiful Bill Act (OBBBA, signed July 2025)',
    locator:
      '2026-09 verified. OBBBA retroactively raised the 2025 standard deduction — originally $30,000 (MFJ)/$15,000 (Single) under IRS Revenue Procedure 2024-40 (issued Oct. 2024, sets 2025 tax year figures) — to $31,500/$15,750, permanently, for the 2025 tax year itself.',
    url: 'https://www.irs.gov/pub/irs-drop/rp-24-40.pdf',
  },
  federal65PlusAddition: {
    source: 'IRS Revenue Procedure 2024-40 (issued Oct. 2024, sets 2025 tax year figures)',
    locator: '§2.02 — additional standard deduction for age 65+',
  },
  federalLtcgBrackets: {
    source: 'IRS Revenue Procedure 2024-40 (issued Oct. 2024, sets 2025 tax year figures)',
    locator: '§2.01 — long-term capital gains rate breakpoints',
  },
  mfsDerived: {
    source: "Derived from this table's own MFJ figures",
    locator:
      'MFS ordinary brackets, LTCG brackets, and the NIIT threshold are statutorily exactly half of MFJ\'s at every breakpoint (26 U.S.C. §1(j) rate schedule structure) — computed in code from the MFJ arrays, not a second hand-typed table, so they can never drift from whatever MFJ figures this file holds.',
  },
  socialSecurityThresholds: {
    source: '26 U.S.C. §86(c)',
    locator:
      'Provisional-income base amounts — statutory, not inflation-indexed since enacted. MFS uses $0 (a taxpayer filing separately who lived with their spouse at any point in the year gets no income-free threshold at all) rather than a smaller version of MFJ/Single\'s.',
  },
  niitThreshold: {
    source: '26 U.S.C. §1411(b)',
    locator: 'Statutory, unindexed since NIIT began in 2013. MFS\'s $125,000 is exactly half of MFJ\'s $250,000.',
  },
  irmaaTiers: {
    source: 'CMS.gov 2025 Medicare Part B/D IRMAA tables',
    url: 'https://www.cms.gov/medicare/basics/premiums',
  },
  irmaaMfsCliff: {
    source: 'CMS.gov 2025 Medicare Part B/D IRMAA tables — married filing separately schedule',
    locator:
      'MFS has only 2 tiers (vs. 5 for MFJ/Single) — the surcharge jumps straight from $0 to the near-top tier at $106,000 MAGI. The dollar surcharge amounts at each MFS tier are the same figures CMS sets for everyone at that tier; only the MAGI thresholds that reach them differ by filing status.',
  },
  rmdTable: {
    source: 'IRS Publication 590-B',
    locator: 'Table III (Uniform Lifetime Table), effective for distribution calendar years 2022 and later',
    url: 'https://www.irs.gov/publications/p590b',
  },
  ssClaimingAdjustment: {
    source: 'Social Security Administration',
    locator:
      'Early retirement reduction (5/9% per month for the first 36 months early, 5/12% per month beyond that) and delayed retirement credit (2/3% per month, up to age 70) — both relative to full retirement age.',
    url: 'https://www.ssa.gov/benefits/retirement/planner/1960.html',
  },
  mnBrackets: {
    source: 'Minnesota Dept. of Revenue',
    locator: '2025 Tax Professional Desk Reference Chart — Minnesota Income Tax Brackets',
    url: 'https://www.revenue.state.mn.us/press-release/2024-12-16/minnesota-income-tax-brackets-standard-deduction-and-dependent-exemption',
  },
  mnStandardDeduction: {
    source: 'Minnesota Dept. of Revenue',
    locator:
      '2025 Tax Professional Desk Reference Chart — Standard Deduction by filing status. 2026-09 verified directly against the chart (was $29,150/$14,575, corrected to $29,900/$14,950).',
  },
  mnStandardDeductionPhaseout: {
    source: 'Minnesota Dept. of Revenue',
    locator:
      '2025 Standard Deduction Limitations & Itemized Deduction Phaseout Table. 2026-09 verified directly against the chart (mfj/single was $220,650, corrected to $238,950 — now consistent with MFS’s $119,475 as exactly half).',
  },
  mnSsSubtraction: {
    source: 'Minnesota Statutes §290.0132',
    locator:
      'Social Security benefit subtraction. MFS: one-half of the joint maximum subtraction and phase-out threshold, phased out at double the joint per-dollar rate (not just from a lower starting point).',
    url: 'https://www.revisor.mn.gov/statutes/cite/290.0132',
  },
};
