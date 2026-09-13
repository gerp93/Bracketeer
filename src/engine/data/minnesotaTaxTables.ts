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
};

// MN standard deduction roughly tracks the federal amount, but phases down
// for higher earners (reduced by 3% of the excess over a filing-status
// threshold, floored well above $0) rather than staying flat like the
// federal deduction.
export const MN_STANDARD_DEDUCTION_BASE_2025: Record<FilingStatus, number> = {
  mfj: 29_150,
  single: 14_575,
};

export const MN_STANDARD_DEDUCTION_PHASEOUT_START_2025: Record<FilingStatus, number> = {
  mfj: 220_650,
  single: 220_650,
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
};

export const MN_SS_SUBTRACTION_PHASEOUT_START_2025: Record<FilingStatus, number> = {
  mfj: 88_630,
  single: 69_250,
};

export const MN_SS_SUBTRACTION_PHASEOUT_RATE = 0.1; // 10 cents of subtraction lost per dollar of AGI over the start
