// Core type shapes for the tax/projection engine. Deliberately kept
// dependency-free (no Electron import anywhere under src/engine) — see
// BRACKETEER_BUILD_PLAN.md's Phase 1 note: the engine is a pure module,
// independently testable, and this is enforced by keeping it isolated
// rather than by a lint rule yet (TODO: add one once the engine has
// enough shape to write it against).

export type FilingStatus = 'mfj' | 'single';

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
