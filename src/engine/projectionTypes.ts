import type { FederalTaxResult, FilingStatus, StateTaxResult } from './types';
import type { IrmaaResult } from './irmaa';

export interface SpouseInput {
  birthYear: number;
  /** Year this spouse is assumed to die, or undefined to model them surviving the whole horizon (the widow's-penalty mechanism only fires if this is set — see ROTH_PLANNER_V1_REQUIREMENTS.md section 3.2). */
  assumedDeathYear?: number;
  /** Annual Social Security benefit at this spouse's full retirement age. */
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
}

export interface YearPlanInput {
  year: number;
  /** The Roth conversion amount being tested for this year — the one thing the user directly controls. */
  conversionAmount: number;
  wages: number;
  pension: number;
  otherOrdinaryIncome: number;
  /** Long-term capital gains realized this year from the taxable account, beyond what funding the spending shortfall forces. */
  discretionaryCapitalGains: number;
  targetSpending: number;
  /** Blended nominal return applied to each account's balance this year. */
  returnAssumption: number;
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
  socialSecurityBenefits: number;
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
