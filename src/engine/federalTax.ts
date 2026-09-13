import type { FederalTaxInput, FederalTaxResult, TaxYearTables } from './types';
import { taxOnAmount, taxOnStackedAmount, marginalRateAt } from './bracketMath';
import { taxableSocialSecurity } from './socialSecurity';
import { ADDITIONAL_STANDARD_DEDUCTION_65_PLUS_MFJ_PER_SPOUSE } from './data/federalTaxTables';

/**
 * The federal tax engine's entry point — an explicit, ordered pipeline,
 * documented here rather than left implicit, because federal tax is NOT a
 * sum of independent parts. It's a fixed point: Social Security taxability
 * depends on "other income" which includes the conversion and capital
 * gains; capital gains stack on top of ordinary income (which includes the
 * now-taxable SS); and IRMAA depends on MAGI from two years prior, which
 * this function surfaces via adjustedGrossIncome but does NOT itself apply
 * (see irmaa.ts's docstring — that's the projection engine's job, since it
 * owns the multi-year MAGI history the lookback needs).
 *
 * Pipeline order (BRACKETEER_BUILD_PLAN.md Phase 1b):
 *   1. Ordinary income before SS (wages/pension/other + taxable conversion)
 *   2. Social Security taxability (needs ordinary income + capital gains
 *      as "other income" in the provisional-income formula)
 *   3. Total ordinary income = step 1 + taxable SS
 *   4. AGI = total ordinary income + capital gains
 *   5. Deductions (standard + 65+ addition)
 *   6. Taxable income, split into an ordinary portion and a gains portion
 *      stacked on top of it (so the gains portion sees the marginal LTCG
 *      rate at the TOP of the ordinary stack, not from zero)
 *   7. Tax on each portion, via their own bracket schedules
 *   8. NIIT, on the lesser of investment income or AGI over the threshold
 */
export function computeFederalTax(tables: TaxYearTables, input: FederalTaxInput): FederalTaxResult {
  const taxableConversion = input.conversionAmount * (1 - input.proRataNonTaxableFraction);
  const ordinaryIncomeBeforeSS = input.otherOrdinaryIncome + taxableConversion;

  const ssOtherIncome = ordinaryIncomeBeforeSS + input.capitalGains;
  const taxableSS = taxableSocialSecurity(
    input.socialSecurityBenefits,
    ssOtherIncome,
    input.filingStatus,
    tables
  );

  const totalOrdinaryIncome = ordinaryIncomeBeforeSS + taxableSS;
  const adjustedGrossIncome = totalOrdinaryIncome + input.capitalGains;

  const deductions = computeDeductions(tables, input);

  const ordinaryTaxableIncome = Math.max(0, totalOrdinaryIncome - deductions);
  const leftoverDeduction = Math.max(0, deductions - totalOrdinaryIncome);
  const gainsTaxableIncome = Math.max(0, input.capitalGains - leftoverDeduction);
  const taxableIncome = ordinaryTaxableIncome + gainsTaxableIncome;

  const ordinaryBrackets = tables.ordinaryBrackets[input.filingStatus];
  const ltcgBrackets = tables.ltcgBrackets[input.filingStatus];

  const taxOnOrdinaryIncome = taxOnAmount(ordinaryTaxableIncome, ordinaryBrackets);
  const taxOnCapitalGains = taxOnStackedAmount(ordinaryTaxableIncome, gainsTaxableIncome, ltcgBrackets);

  const niitThreshold = tables.niitThreshold[input.filingStatus];
  // Simplification: investment income for NIIT purposes is treated as
  // capital gains only (no interest/dividend/rental income modeled yet).
  const niit = tables.niitRate * Math.max(0, Math.min(input.capitalGains, adjustedGrossIncome - niitThreshold));

  const totalFederalTax = taxOnOrdinaryIncome + taxOnCapitalGains + niit;

  return {
    ordinaryIncomeBeforeSS,
    taxableSocialSecurity: taxableSS,
    totalOrdinaryIncome,
    adjustedGrossIncome,
    deductions,
    ordinaryTaxableIncome,
    gainsTaxableIncome,
    taxableIncome,
    taxOnOrdinaryIncome,
    taxOnCapitalGains,
    niit,
    totalFederalTax,
    marginalOrdinaryRate: marginalRateAt(ordinaryTaxableIncome, ordinaryBrackets),
  };
}

function computeDeductions(tables: TaxYearTables, input: FederalTaxInput): number {
  const base = tables.standardDeduction[input.filingStatus];
  if (input.filingStatus === 'mfj') {
    return base + input.age65PlusCount * ADDITIONAL_STANDARD_DEDUCTION_65_PLUS_MFJ_PER_SPOUSE;
  }
  return base + (input.age65PlusCount > 0 ? tables.additionalStandardDeduction65Plus : 0);
}
