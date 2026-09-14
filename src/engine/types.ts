// Core type shapes for the tax/projection engine. Deliberately kept
// dependency-free (no Electron import anywhere under src/engine) — see
// BRACKETEER_BUILD_PLAN.md's Phase 1 note: the engine is a pure module,
// independently testable, and this is enforced by keeping it isolated
// rather than by a lint rule yet (TODO: add one once the engine has
// enough shape to write it against).

export type FilingStatus = 'mfj' | 'single' | 'mfs';

export interface TaxYearTables {
  year: number;
  /** Real, enacted-law figures vs. inflated from the newest known year. */
  status: 'actual' | 'projected';
  ordinaryBrackets: Record<FilingStatus, Bracket[]>;
  standardDeduction: Record<FilingStatus, number>;
  additionalStandardDeduction65Plus: number;
  ltcgBrackets: Record<FilingStatus, Bracket[]>;
  socialSecurity: {
    /** Provisional income thresholds where 50% / 85% of benefits become taxable. */
    firstThreshold: Record<FilingStatus, number>;
    secondThreshold: Record<FilingStatus, number>;
  };
  niitThreshold: Record<FilingStatus, number>;
  niitRate: number;
  irmaa: {
    partB: IrmaaTier[];
    partD: IrmaaTier[];
  };
  rmdUniformLifetimeTable: Record<number, number>;
}

export interface Bracket {
  /** Inclusive lower bound of this bracket, in dollars of taxable income. */
  from: number;
  /** Exclusive upper bound, or undefined for the top bracket. */
  to?: number;
  rate: number;
}

export interface IrmaaTier {
  /** MAGI lower bound (inclusive) that triggers this tier, per person. */
  magiFrom: number;
  magiTo?: number;
  monthlySurchargePerPerson: number;
}

/**
 * A jurisdiction's state tax module. Minnesota is the only v1
 * implementation; every other state resolves to FlatRateState.
 * See BRACKETEER_BUILD_PLAN.md Phase 2.
 */
export interface StateTaxModule {
  stateCode: string;
  computeStateTax(input: StateTaxInput): StateTaxResult;
}

export interface StateTaxInput {
  federalAgi: number;
  federalTaxableIncome: number;
  ordinaryIncome: number;
  capitalGains: number;
  socialSecurityBenefits: number;
  filingStatus: FilingStatus;
  year: number;
}

export interface StateTaxResult {
  stateTaxableIncome: number;
  stateTax: number;
  /** Any state-specific marginal note worth surfacing (e.g. MN's SS subtraction phase-out). */
  notes: string[];
}

/** One household-year's inputs to the federal tax pipeline. */
export interface FederalTaxInput {
  filingStatus: FilingStatus;
  /** Count of spouses/filers age 65+ this year (0, 1, or 2 for MFJ; 0 or 1 for single). */
  age65PlusCount: 0 | 1 | 2;
  /** Wages, pension, other ordinary income, and RMDs already taken — everything ordinary except the conversion itself. */
  otherOrdinaryIncome: number;
  /** The Roth conversion amount being tested for this year. */
  conversionAmount: number;
  /** Long-term capital gains / qualified dividends realized this year. */
  capitalGains: number;
  /** Gross Social Security benefits received this year (before any taxability calc). */
  socialSecurityBenefits: number;
  /**
   * Fraction of the conversion that is non-taxable basis, from the
   * pro-rata rule (IRC 408(d)(2)) when the traditional account holds
   * nondeductible contributions. 0 = fully pre-tax (the common case).
   */
  proRataNonTaxableFraction: number;
}

export interface FederalTaxResult {
  /** Ordinary income before the SS taxability calc: otherOrdinaryIncome + taxable portion of the conversion. */
  ordinaryIncomeBeforeSS: number;
  taxableSocialSecurity: number;
  /** ordinaryIncomeBeforeSS + taxableSocialSecurity. */
  totalOrdinaryIncome: number;
  /** totalOrdinaryIncome + capitalGains — also this year's MAGI for IRMAA purposes (see irmaa.ts's two-year-lookback note). */
  adjustedGrossIncome: number;
  deductions: number;
  ordinaryTaxableIncome: number;
  gainsTaxableIncome: number;
  taxableIncome: number;
  taxOnOrdinaryIncome: number;
  taxOnCapitalGains: number;
  niit: number;
  totalFederalTax: number;
  /** Marginal rate on the next ordinary dollar, ignoring gains/SS/NIIT interaction (see marginalRate.ts for the true composite figure). */
  marginalOrdinaryRate: number;
}
