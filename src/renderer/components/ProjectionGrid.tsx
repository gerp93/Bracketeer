import type { YearPlanInput } from '../../engine/projectionTypes';
import type { ProjectionSummary } from '../../engine/projectionTypes';
import { formatCurrency, formatPercent } from '../format';

interface Props {
  summary: ProjectionSummary;
  yearPlans: YearPlanInput[];
  onYearPlanChange: (year: number, patch: Partial<YearPlanInput>) => void;
  selectedYear: number | null;
  onSelectYear: (year: number) => void;
}

/**
 * The centerpiece: a year-by-year grid, conversion amount editable in
 * place, recalculating immediately (the summary prop is already the fresh
 * result — App.tsx recomputes runProjection on every keystroke). Every
 * other column is read-only output, so the eye can track exactly which
 * one lever (conversion) is producing which consequences.
 */
export default function ProjectionGrid({ summary, yearPlans, onYearPlanChange, selectedYear, onSelectYear }: Props) {
  const planByYear = new Map(yearPlans.map((p) => [p.year, p]));

  return (
    <div className="panel">
      <h2>Projection</h2>
      <div className="grid-scroll">
        <table className="projection-grid">
          <thead>
            <tr>
              <th>Year</th>
              <th>Ages</th>
              <th>Filing</th>
              <th>RMD</th>
              <th>Conversion</th>
              <th>SS</th>
              <th>Fed. tax</th>
              <th>State tax</th>
              <th>IRMAA</th>
              <th>Total tax</th>
              <th>Eff. rate</th>
              <th>Traditional</th>
              <th>Roth</th>
              <th>Taxable</th>
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
                  <td>{y.ages.join(' / ')}</td>
                  <td title={y.isWidowPenaltyYear ? "First year as a single filer after a spouse's assumed death" : ''}>
                    {y.filingStatus}
                    {y.isWidowPenaltyYear ? ' ⚠' : ''}
                  </td>
                  <td>{formatCurrency(y.rmdAmount)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      value={plan?.conversionAmount ?? 0}
                      onChange={(e) => onYearPlanChange(y.year, { conversionAmount: Number(e.target.value) })}
                    />
                  </td>
                  <td>{formatCurrency(y.socialSecurityBenefits)}</td>
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
