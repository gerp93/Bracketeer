import type { FederalTaxResult, FilingStatus, StateTaxResult } from './types';
import type { IrmaaResult } from './irmaa';

export interface SpouseInput {
  name: string;
  birthYear: number;
  /** Year this spouse is assumed to die, or undefined to model them surviving the whole horizon (the widow's-penalty mechanism only fires if this is set — see ROTH_PLANNER_V1_REQUIREMENTS.md section 3.2). */
  assumedDeathYear?: number;
  /** Annual Social Security benefit at this spouse's full retirement age (their "PIA") — not something the engine can look up or derive; it comes from that spouse's actual SSA earnings record (ssa.gov/myaccount), since it depends on their personal 35-year earnings history rather than a government table. */
  ssBenefitAtFRA: number;
  ssClaimingAge: number;
}

export interface AccountBalances {
  traditional: number;
  /** Nondeductible contributions already made to the traditional account — drives the pro-rata rule. */
  traditionalBasis: number;
  roth: number;
  taxable: number;
  taxableCostBasis: number;
}

export interface HouseholdInput {
  /** v1 always starts MFJ (ROTH_PLANNER_V1_REQUIREMENTS.md section 6) — single is reached only via a spouse's assumed death, never chosen as the starting status. */
  spouses: [SpouseInput, SpouseInput];
  stateCode: string;
  /** Used only if stateCode has no dedicated module (FlatRateState fallback). */
  flatRateStateFallbackRate: number;
  startYear: number;
  horizonYears: number;
  /** Marginal rate assumed for the heir(s) inheriting the traditional balance — used to haircut it for the terminal-after-tax-wealth metric. */
  assumedHeirMarginalRate: number;
  generalInflationAssumption: number;
  startingBalances: AccountBalances;
  /** Actual MAGI for the two years immediately before startYear — seeds IRMAA's two-year lookback so the first two projected years' surcharge reflects real history instead of assuming $0 income. */
  priorMagiHistory: {
    twoYearsBefore: number;
    oneYearBefore: number;
  };
}

export interface YearPlanInput {
  year: number;
  /** The Roth conversion amount being tested for this year — the one thing the user directly controls. */
  conversionAmount: number;
  /** Money taken out of Roth this year to spend — unlike conversionAmount, this is tax-free income (no effect on AGI/MAGI/IRMAA) and directly offsets the year's cash need, reducing what's pulled from the Brokerage account. Capped at the Roth balance at the start of the year. */
  rothWithdrawal: number;
  wages: number;
  pension: number;
  otherOrdinaryIncome: number;
  /** Long-term capital gains realized this year from the taxable account, beyond what funding the spending shortfall forces. */
  discretionaryCapitalGains: number;
  targetSpending: number;
  /** Blended nominal return applied to each account's balance this year. */
  returnAssumption: number;
}

/** One spouse's Social Security math for a single year — everything the SS column tooltip needs to show its work. */
export interface SpouseSsDetail {
  name: string;
  /** Their benefit at full retirement age, in today's dollars — the raw input the user typed in. */
  baseAtFRA: number;
  /** This spouse's own benefit this year (adjusted for claiming age, inflated forward), as if they were alive and past their claiming age — used both directly (both-alive years) and as the "hypothetical" figure a survivor's step-up compares against. */
  hypotheticalBenefit: number;
  /** True once this spouse has reached their chosen claiming age. */
  hasClaimed: boolean;
  claimingAge: number;
  /** Multiplier applied to ssBenefitAtFRA for claiming at this age (1 = no adjustment, <1 = early-claiming reduction, >1 = delayed-claiming credit). */
  claimingAdjustmentFactor: number;
  alive: boolean;
}

export interface SocialSecurityDetail {
  spouseA: SpouseSsDetail;
  spouseB: SpouseSsDetail;
  /** True when one spouse has died and the household's benefit is the survivor stepping up to the larger of the two spouses' amounts, rather than both benefits added together. */
  isSurvivorBenefit: boolean;
}

export interface ProjectionYearResult {
  year: number;
  ages: [number, number];
  filingStatus: FilingStatus;
  /** True the first year the household is single because a spouse died the year before. */
  isWidowPenaltyYear: boolean;
  startingBalances: AccountBalances;
  rmdAmount: number;
  conversionAmount: number;
  rothWithdrawal: number;
  socialSecurityBenefits: number;
  socialSecurityDetail: SocialSecurityDetail;
  capitalGainsRealized: number;
  federalResult: FederalTaxResult;
  stateResult: StateTaxResult;
  irmaaResult: IrmaaResult;
  totalTax: number;
  effectiveRate: number;
  endingBalances: AccountBalances;
  /** This year's MAGI — stored so a future year's IRMAA lookback (2 years later) can read it back. */
  magi: number;
}

export interface ProjectionSummary {
  years: ProjectionYearResult[];
  lifetimeTaxPaid: number;
  terminalBalances: AccountBalances;
  /** Traditional balance haircut by assumedHeirMarginalRate, plus Roth and taxable at face value — the headline comparison metric. */
  terminalAfterTaxWealth: number;
}
