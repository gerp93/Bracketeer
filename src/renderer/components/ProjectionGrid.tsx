import type { SocialSecurityDetail, SpouseSsDetail, YearPlanInput } from '../../engine/projectionTypes';
import type { FilingStatus } from '../../engine/types';
import type { ProjectionSummary } from '../../engine/projectionTypes';
import { formatCurrency, formatPercent } from '../format';
import InfoTooltip from './InfoTooltip';
import CurrencyInput from './CurrencyInput';

function formatFilingStatus(status: FilingStatus): string {
  if (status === 'mfj') return 'MFJ';
  if (status === 'mfs') return 'MFS';
  return 'Single';
}

interface Props {
  summary: ProjectionSummary;
  yearPlans: YearPlanInput[];
  onYearPlanChange: (year: number, patch: Partial<YearPlanInput>) => void;
  selectedYear: number | null;
  onSelectYear: (year: number) => void;
  /** True for a solo (never-married) household — spouse[1] in socialSecurityDetail is a phantom placeholder and shouldn't appear in the SS tooltip at all. */
  isSolo: boolean;
}

function formatAdjustment(factor: number): string {
  if (factor === 1) return 'no early/delayed adjustment';
  const pct = (factor - 1) * 100;
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}% for claiming at that age`;
}

function spouseLine(s: SpouseSsDetail): string {
  if (!s.hasClaimed) return `${s.name}: not yet claiming (starts at age ${s.claimingAge})`;
  return `${s.name}: ${formatCurrency(s.baseAtFRA)} at full retirement age, ${formatAdjustment(
    s.claimingAdjustmentFactor
  )}, inflated forward → ${formatCurrency(s.hypotheticalBenefit)} this year`;
}

/** Builds the SS cell's tooltip text — the year-by-year arithmetic behind the household total shown in the column. */
function buildSsTooltip(detail: SocialSecurityDetail, total: number, isSolo: boolean): string {
  const { spouseA, spouseB, isSurvivorBenefit } = detail;
  if (isSolo) {
    return spouseLine(spouseA);
  }
  if (!isSurvivorBenefit) {
    return `${spouseLine(spouseA)}\n${spouseLine(spouseB)}\nHousehold total: ${formatCurrency(total)}`;
  }
  const survivor = spouseA.alive ? spouseA : spouseB;
  const deceased = spouseA.alive ? spouseB : spouseA;
  return (
    `${deceased.name} has passed away. ${survivor.name} steps up to the larger of what either spouse would have ` +
    `received:\n${spouseLine(survivor)}\n${deceased.name} would have received: ${formatCurrency(
      deceased.hypotheticalBenefit
    )}\nSurvivor benefit this year: ${formatCurrency(total)}`
  );
}

/**
 * The centerpiece: a year-by-year grid, conversion amount editable in
 * place, recalculating immediately (the summary prop is already the fresh
 * result — App.tsx recomputes runProjection on every keystroke). Wages,
 * pension, and other income are editable the same way; everything else is
 * read-only output, so the eye can track exactly which levers are producing
 * which consequences.
 */
export default function ProjectionGrid({
  summary,
  yearPlans,
  onYearPlanChange,
  selectedYear,
  onSelectYear,
  isSolo,
}: Props) {
  const planByYear = new Map(yearPlans.map((p) => [p.year, p]));

  const traditionalDepletedYear = summary.years.find(
    (y) => Math.max(0, y.startingBalances.traditional - y.rmdAmount) < 0.5
  )?.year;
  const rothDepletedYear = summary.years.find((y) => y.startingBalances.roth < 0.5)?.year;
  const brokerageDepletedYear = summary.years.find((y) => y.startingBalances.taxable < 0.5)?.year;

  return (
    <div className="panel">
      <h2>Projection</h2>
      {(traditionalDepletedYear !== undefined ||
        rothDepletedYear !== undefined ||
        brokerageDepletedYear !== undefined) && (
        <div className="projection-alert">
          {traditionalDepletedYear !== undefined && (
            <p>
              Traditional has nothing left starting in <strong>{traditionalDepletedYear}</strong> — the Conversion
              and Trad. w/d cells are both locked at $0 from that year on. Reduce an earlier year&rsquo;s conversion
              or withdrawal to free up room.
            </p>
          )}
          {rothDepletedYear !== undefined && (
            <p>
              Roth has nothing left to withdraw starting in <strong>{rothDepletedYear}</strong> — the Roth w/d cell
              is locked at $0 from that year on.
            </p>
          )}
          {brokerageDepletedYear !== undefined && (
            <p>
              Brokerage is empty starting in <strong>{brokerageDepletedYear}</strong> — spending or taxes beyond
              what Roth/Traditional withdrawals and other income cover won&rsquo;t actually get funded from that year
              on, even though Target spending stays whatever you typed in.
            </p>
          )}
        </div>
      )}
      <div className="grid-scroll">
        <table className="projection-grid">
          <thead>
            <tr>
              <th>
                Year
                <InfoTooltip placement="bottom" text="The calendar year this row represents." />
              </th>
              <th>
                Ages
                <InfoTooltip
                  placement="bottom"
                  text="Each spouse's age this year, in the same order as the household form above."
                />
              </th>
              <th>
                Filing
                <InfoTooltip
                  placement="bottom"
                  text="Tax filing status for the year — MFJ while both spouses are alive, switching to Single the year after either spouse's assumed death."
                />
              </th>
              <th>
                Wages
                <InfoTooltip placement="bottom" text="Editable. Ordinary wage/self-employment income planned for this year." />
              </th>
              <th>
                Pension
                <InfoTooltip placement="bottom" text="Editable. Ordinary pension income planned for this year." />
              </th>
              <th>
                Other inc.
                <InfoTooltip
                  placement="bottom"
                  text="Editable. Any other ordinary taxable income not already covered by wages, pension, RMDs, or the conversion — e.g. rental or taxable interest income."
                />
              </th>
              <th>
                RMD
                <InfoTooltip
                  placement="bottom"
                  text="Read-only. The mandatory withdrawal the IRS forces from the Traditional balance once you're old enough — not a choice, unlike Conversion."
                />
              </th>
              <th>
                Conversion
                <InfoTooltip
                  placement="bottom"
                  text="Editable. How much you're choosing to convert from Traditional to Roth this year — taxed as ordinary income now, automatically capped at what's left in Traditional after this year's RMD. Resolved before Trad. w/d, so a large conversion can leave less room for that column. Hover any cell's own icon for that row's available headroom — a highlighted cell means what you entered got capped."
                />
              </th>
              <th>
                Trad. w/d
                <InfoTooltip
                  placement="bottom"
                  text="Editable. Money taken out of Traditional this year to spend, beyond the RMD — the normal 'live on IRA distributions' pattern, as opposed to Conversion (which moves money to Roth instead of your pocket). Taxed as ordinary income just like a conversion, and reduces the Traditional balance. Capped at what's left in Traditional after this year's RMD and Conversion — hover a cell's own icon for that row's headroom."
                />
              </th>
              <th>
                Roth w/d
                <InfoTooltip
                  placement="bottom"
                  text="Editable. Money taken out of Roth this year to spend. Unlike every other income column, this is tax-free — it doesn't touch Fed./State tax, IRMAA, or Eff. rate — and it directly reduces what has to come out of Brokerage to cover spending. Capped at the Roth balance at the start of the year — hover a cell's own icon for that row's headroom."
                />
              </th>
              <th>
                Target spending
                <InfoTooltip
                  placement="bottom"
                  text="Editable. Total cash you want available to spend this year, after tax. Whatever Wages, Pension, Other inc., RMD, SS, Roth w/d, and Trad. w/d don't cover — including this year's own tax bill — is drawn automatically from Brokerage (see Brokerage w/d)."
                />
              </th>
              <th>
                Extra cap. gains
                <InfoTooltip
                  placement="bottom"
                  text="Editable. Long-term capital gains you choose to realize from Brokerage this year beyond whatever the spending shortfall already forces (e.g. deliberate gain harvesting). Taxed at LTCG rates, stacked on top of ordinary income."
                />
              </th>
              <th>
                Brokerage w/d
                <InfoTooltip
                  placement="bottom"
                  text="Read-only. Actual dollars pulled from Brokerage this year to cover Target spending plus this year's tax bill, after Wages/Pension/Other inc./RMD/SS/Roth w/d/Trad. w/d are applied — capped at the Brokerage balance at the start of the year."
                />
              </th>
              <th>
                SS
                <InfoTooltip
                  placement="bottom"
                  text="Read-only. Total household Social Security income this year. Hover a row's value in this column for the year-by-year math behind it."
                />
              </th>
              <th>
                Fed. tax
                <InfoTooltip placement="bottom" text="Read-only. Total federal income tax owed for the year." />
              </th>
              <th>
                State tax
                <InfoTooltip placement="bottom" text="Read-only. Minnesota (or flat-rate) state income tax owed for the year." />
              </th>
              <th>
                IRMAA
                <InfoTooltip
                  placement="bottom"
                  text="Read-only. The Medicare Part B/D surcharge for higher earners, based on MAGI from two years earlier."
                />
              </th>
              <th>
                Total tax
                <InfoTooltip placement="bottom" text="Fed. tax + State tax + IRMAA combined." />
              </th>
              <th>
                Eff. rate
                <InfoTooltip
                  placement="bottom"
                  text="Total tax divided by Adjusted Gross Income for the year — the blended rate actually paid, not a marginal bracket rate."
                />
              </th>
              <th>
                Traditional
                <InfoTooltip
                  placement="bottom"
                  text="Read-only. Traditional account balance at year end, after this year's RMD, conversion, Trad. w/d, and growth."
                />
              </th>
              <th>
                Roth
                <InfoTooltip
                  placement="bottom"
                  text="Read-only. Roth account balance at year end, after this year's conversion in, Roth w/d out, and growth."
                />
              </th>
              <th>
                Brokerage
                <InfoTooltip
                  placement="bottom"
                  text="Read-only. Balance in the regular (non-retirement, a.k.a. 'taxable') brokerage account at year end, after any withdrawal used to cover spending or taxes, and growth."
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.years.map((y) => {
              const plan = planByYear.get(y.year);
              return (
                <tr
                  key={y.year}
                  className={
                    (y.year === selectedYear ? 'is-selected ' : '') + (y.isWidowPenaltyYear ? 'is-widow-year' : '')
                  }
                  onClick={() => onSelectYear(y.year)}
                >
                  <td>{y.year}</td>
                  <td>{isSolo ? y.ages[0] : y.ages.join(' / ')}</td>
                  <td>
                    {y.isWidowPenaltyYear ? (
                      <InfoTooltip placement="bottom" text="First year as a single filer after a spouse's assumed death">
                        {formatFilingStatus(y.filingStatus)} ⚠
                      </InfoTooltip>
                    ) : (
                      formatFilingStatus(y.filingStatus)
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <CurrencyInput
                      value={plan?.wages ?? 0}
                      onChange={(v) => onYearPlanChange(y.year, { wages: v })}
                    />
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <CurrencyInput
                      value={plan?.pension ?? 0}
                      onChange={(v) => onYearPlanChange(y.year, { pension: v })}
                    />
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <CurrencyInput
                      value={plan?.otherOrdinaryIncome ?? 0}
                      onChange={(v) => onYearPlanChange(y.year, { otherOrdinaryIncome: v })}
                    />
                  </td>
                  <td>{formatCurrency(y.rmdAmount)}</td>
                  {(() => {
                    const availableToConvert = Math.max(0, y.startingBalances.traditional - y.rmdAmount);
                    const isDepleted = availableToConvert < 0.5;
                    const enteredConversion = plan?.conversionAmount ?? 0;
                    const isCapped = !isDepleted && enteredConversion > y.conversionAmount + 0.5;
                    return (
                      <td
                        onClick={(e) => e.stopPropagation()}
                        className={isCapped ? 'is-capped' : isDepleted ? 'is-depleted' : ''}
                      >
                        <CurrencyInput
                          value={enteredConversion}
                          onChange={(v) => onYearPlanChange(y.year, { conversionAmount: v })}
                          disabled={isDepleted}
                        />
                        <div className="cell-headroom">
                          {formatCurrency(availableToConvert)} left
                          <InfoTooltip
                            placement="bottom"
                            text={
                              isDepleted
                                ? "Nothing left in Traditional to convert this year — disabled. Reduce an earlier year's conversion to free up room."
                                : isCapped
                                  ? `Only ${formatCurrency(y.conversionAmount)} was actually converted this year — capped at what's left in Traditional (${formatCurrency(availableToConvert)}) after this year's RMD. The rest of the ${formatCurrency(enteredConversion)} you entered wasn't applied.`
                                  : `Up to ${formatCurrency(availableToConvert)} available to convert this year (Traditional ${formatCurrency(y.startingBalances.traditional)} minus this year's RMD ${formatCurrency(y.rmdAmount)}).`
                            }
                          />
                        </div>
                      </td>
                    );
                  })()}
                  {(() => {
                    const availableToWithdrawTraditional = Math.max(
                      0,
                      y.startingBalances.traditional - y.rmdAmount - y.conversionAmount
                    );
                    const isDepleted = availableToWithdrawTraditional < 0.5;
                    const enteredTraditionalWithdrawal = plan?.traditionalWithdrawal ?? 0;
                    const isCapped = !isDepleted && enteredTraditionalWithdrawal > y.traditionalWithdrawal + 0.5;
                    return (
                      <td
                        onClick={(e) => e.stopPropagation()}
                        className={isCapped ? 'is-capped' : isDepleted ? 'is-depleted' : ''}
                      >
                        <CurrencyInput
                          value={enteredTraditionalWithdrawal}
                          onChange={(v) => onYearPlanChange(y.year, { traditionalWithdrawal: v })}
                          disabled={isDepleted}
                        />
                        <div className="cell-headroom">
                          {formatCurrency(availableToWithdrawTraditional)} left
                          <InfoTooltip
                            placement="bottom"
                            text={
                              isDepleted
                                ? "Nothing left in Traditional to withdraw this year — disabled. Reduce this year's conversion, or an earlier year's conversion/withdrawal, to free up room."
                                : isCapped
                                  ? `Only ${formatCurrency(y.traditionalWithdrawal)} was actually withdrawn this year — capped at what's left in Traditional (${formatCurrency(availableToWithdrawTraditional)}) after this year's RMD and Conversion. The rest of the ${formatCurrency(enteredTraditionalWithdrawal)} you entered wasn't applied.`
                                  : `Up to ${formatCurrency(availableToWithdrawTraditional)} available to withdraw this year (Traditional ${formatCurrency(y.startingBalances.traditional)} minus this year's RMD ${formatCurrency(y.rmdAmount)} and Conversion ${formatCurrency(y.conversionAmount)}).`
                            }
                          />
                        </div>
                      </td>
                    );
                  })()}
                  {(() => {
                    const availableToWithdraw = y.startingBalances.roth;
                    const isDepleted = availableToWithdraw < 0.5;
                    const enteredWithdrawal = plan?.rothWithdrawal ?? 0;
                    const isCapped = !isDepleted && enteredWithdrawal > y.rothWithdrawal + 0.5;
                    return (
                      <td
                        onClick={(e) => e.stopPropagation()}
                        className={isCapped ? 'is-capped' : isDepleted ? 'is-depleted' : ''}
                      >
                        <CurrencyInput
                          value={enteredWithdrawal}
                          onChange={(v) => onYearPlanChange(y.year, { rothWithdrawal: v })}
                          disabled={isDepleted}
                        />
                        <div className="cell-headroom">
                          {formatCurrency(availableToWithdraw)} left
                          <InfoTooltip
                            placement="bottom"
                            text={
                              isDepleted
                                ? 'Nothing left in Roth to withdraw this year — disabled.'
                                : isCapped
                                  ? `Only ${formatCurrency(y.rothWithdrawal)} was actually withdrawn this year — capped at the Roth balance at the start of the year (${formatCurrency(availableToWithdraw)}). The rest of the ${formatCurrency(enteredWithdrawal)} you entered wasn't applied.`
                                  : `Up to ${formatCurrency(availableToWithdraw)} available to withdraw from Roth this year.`
                            }
                          />
                        </div>
                      </td>
                    );
                  })()}
                  <td onClick={(e) => e.stopPropagation()}>
                    <CurrencyInput
                      value={plan?.targetSpending ?? 0}
                      onChange={(v) => onYearPlanChange(y.year, { targetSpending: v })}
                    />
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <CurrencyInput
                      value={plan?.discretionaryCapitalGains ?? 0}
                      onChange={(v) => onYearPlanChange(y.year, { discretionaryCapitalGains: v })}
                    />
                  </td>
                  <td>{formatCurrency(y.brokerageWithdrawal)}</td>
                  <td>
                    <InfoTooltip placement="bottom" text={buildSsTooltip(y.socialSecurityDetail, y.socialSecurityBenefits, isSolo)}>
                      {formatCurrency(y.socialSecurityBenefits)}
                    </InfoTooltip>
                  </td>
                  <td>{formatCurrency(y.federalResult.totalFederalTax)}</td>
                  <td>{formatCurrency(y.stateResult.stateTax)}</td>
                  <td>{formatCurrency(y.irmaaResult.annualSurchargeTotal)}</td>
                  <td>
                    <strong>{formatCurrency(y.totalTax)}</strong>
                  </td>
                  <td>{formatPercent(y.effectiveRate)}</td>
                  <td>{formatCurrency(y.endingBalances.traditional)}</td>
                  <td>{formatCurrency(y.endingBalances.roth)}</td>
                  <td>{formatCurrency(y.endingBalances.taxable)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="summary-row">
        <div>
          Lifetime tax paid: <strong>{formatCurrency(summary.lifetimeTaxPaid)}</strong>
        </div>
        <div>
          Terminal after-tax wealth: <strong>{formatCurrency(summary.terminalAfterTaxWealth)}</strong>
        </div>
      </div>
    </div>
  );
}
