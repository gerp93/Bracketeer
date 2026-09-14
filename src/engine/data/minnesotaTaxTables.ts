import type { Bracket, FilingStatus } from '../types';

// 2025 Minnesota tax year figures. Per ROTH_PLANNER_V1_REQUIREMENTS.md
// section 3.4 / TODO.md: these need to be spot-checked against Minnesota
// Department of Revenue publications before this app is relied on for a
// real decision. Structurally: MN starts from federal AGI, has its own
// four brackets, taxes capital gains as ordinary income (no 0%/15% LTCG
// equivalent), has its own standard deduction that phases down at higher
// incomes, and has a Social Security subtraction that phases out by income.

export const MN_BRACKETS_2025: Record<FilingStatus, Bracket[]> = {
  mfj: [
    { from: 0, to: 47_620, rate: 0.0535 },
    { from: 47_620, to: 189_180, rate: 0.068 },
    { from: 189_180, to: 330_410, rate: 0.0785 },
    { from: 330_410, rate: 0.0985 },
  ],
  single: [
    { from: 0, to: 32_570, rate: 0.0535 },
    { from: 32_570, to: 106_990, rate: 0.068 },
    { from: 106_990, to: 198_630, rate: 0.0785 },
    { from: 198_630, rate: 0.0985 },
  ],
  // Directly from the Minnesota Dept. of Revenue's own 2025 Tax
  // Professional Desk Reference Chart — exactly half of the mfj thresholds
  // above at every breakpoint (MN's MFS brackets are always defined as half
  // of the joint brackets, same relationship as the federal ones).
  mfs: [
    { from: 0, to: 23_810, rate: 0.0535 },
    { from: 23_810, to: 94_590, rate: 0.068 },
    { from: 94_590, to: 165_205, rate: 0.0785 },
    { from: 165_205, rate: 0.0985 },
  ],
};

// MN standard deduction roughly tracks the federal amount, but phases down
// for higher earners (reduced by 3% of the excess over a filing-status
// threshold, floored well above $0) rather than staying flat like the
// federal deduction.
// 2026-09 verified directly against the MN Dept. of Revenue's own 2025 Tax
// Professional Desk Reference Chart (fetched directly, not a secondhand
// aggregator) — was $29,150/$14,575, corrected to the chart's actual figures.
export const MN_STANDARD_DEDUCTION_BASE_2025: Record<FilingStatus, number> = {
  mfj: 29_900,
  single: 14_950,
  // Equal to single's by statute, always — reuses that figure rather than
  // a second hand-typed copy.
  mfs: 14_950,
};

// 2026-09 verified directly against the same chart's "2025 Standard
// Deduction Limitations & Itemized Deduction Phaseout Table": $238,950 for
// mfj/single (was $220,650), $119,475 for MFS — which is now consistent as
// exactly half of the corrected mfj/single figure, resolving the mismatch
// this comment used to flag.
export const MN_STANDARD_DEDUCTION_PHASEOUT_START_2025: Record<FilingStatus, number> = {
  mfj: 238_950,
  single: 238_950,
  mfs: 119_475,
};

export const MN_STANDARD_DEDUCTION_PHASEOUT_RATE = 0.03;
export const MN_STANDARD_DEDUCTION_FLOOR_FRACTION = 0.2; // never phases below 20% of the base amount

// Minnesota's Social Security subtraction: up to this much of taxable
// federal Social Security can be subtracted from MN taxable income, phased
// out as MN AGI (approximated here as federal AGI) rises past the
// threshold, at this rate per dollar over it, down to $0.
export const MN_SS_SUBTRACTION_MAX_2025: Record<FilingStatus, number> = {
  mfj: 6_960,
  single: 5_440,
  // MN Dept. of Revenue: a spouse filing separately may claim up to
  // one-half of the joint maximum subtraction — derived from this table's
  // own mfj figure so it can't drift from it.
  mfs: 6_960 / 2,
};

export const MN_SS_SUBTRACTION_PHASEOUT_START_2025: Record<FilingStatus, number> = {
  mfj: 88_630,
  single: 69_250,
  // Same rule as the max subtraction above: MFS's phase-out threshold is
  // exactly half of mfj's.
  mfs: 88_630 / 2,
};

/**
 * 10 cents of subtraction lost per dollar of AGI over the start — except
 * MFS, which phases out at DOUBLE that rate (confirmed via MN Dept. of
 * Revenue guidance: joint filers lose 10% of the max per $4,000 of excess
 * AGI, separate filers lose it per $2,000 — twice as fast, not just from a
 * lower starting point). A real behavioral difference, not just a smaller
 * number, which is why this is keyed by filing status rather than a single
 * shared constant like the other MN phase-out rates in this file.
 */
export const MN_SS_SUBTRACTION_PHASEOUT_RATE: Record<FilingStatus, number> = {
  mfj: 0.1,
  single: 0.1,
  mfs: 0.2,
};
