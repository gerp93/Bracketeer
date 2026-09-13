import type { HouseholdInput, YearPlanInput } from '../../engine/projectionTypes';
import { computeMarginalRateBreakdown, computeHeadroomMarkers } from '../../engine/marginalRate';
import { formatCurrency, formatPercent } from '../format';

interface Props {
  household: HouseholdInput;
  yearPlans: YearPlanInput[];
  year: number | null;
}

/**
 * The differentiating feature (ROTH_PLANNER_V1_REQUIREMENTS.md section
 * 3.6): the true marginal cost of the next converted dollar for the
 * selected year, decomposed by finite difference on the real engine — not
 * a second, hand-derived formula — plus passive headroom markers. Purely
 * informational: it never suggests a conversion amount, only what the next
 * dollar would cost and where the nearest walls are.
 */
export default function MarginalRatePanel({ household, yearPlans, year }: Props) {
  if (year === null) {
    return (
      <div className="panel">
        <h2>Marginal rate</h2>
        <p className="muted">Select a year in the grid to see the true cost of its next converted dollar.</p>
      </div>
    );
  }

  let breakdown, markers;
  try {
    breakdown = computeMarginalRateBreakdown(household, yearPlans, year, 1_000);
    markers = computeHeadroomMarkers(household, yearPlans, year);
  } catch {
    return (
      <div className="panel">
        <h2>Marginal rate — {year}</h2>
        <p className="muted">That year is outside the current projection horizon.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Marginal rate — {year}</h2>
      <p className="marginal-rate-headline">
        The next $1,000 converted this year costs{' '}
        <strong>{formatCurrency(breakdown.totalCost)}</strong> ({formatPercent(breakdown.trueMarginalRate)})
      </p>
      <table className="marginal-breakdown">
        <tbody>
          <Row label="Federal bracket" value={breakdown.federalBracketComponent} />
          <Row label="Social Security dragged into taxability" value={breakdown.socialSecurityTaxabilityComponent} />
          <Row label="Capital gains stacking" value={breakdown.capitalGainsStackingComponent} />
          <Row label="NIIT" value={breakdown.niitComponent} />
          <Row label="State (Minnesota / flat-rate)" value={breakdown.stateComponent} />
          <Row label="IRMAA (2 years out)" value={breakdown.irmaaComponent} />
        </tbody>
      </table>

      <h3>Headroom before the next wall</h3>
      <ul className="headroom-list">
        <Marker label="Top of current federal bracket" value={markers.toNextFederalBracket} />
        <Marker label="Top of 0% LTCG bracket" value={markers.toTopOfZeroPercentLtcg} />
        <Marker label="Next IRMAA tier (2 years out)" value={markers.toNextIrmaaTier} />
        <Marker label="MN phase-out start (SS subtraction / std. deduction)" value={markers.toMnPhaseoutStart} />
      </ul>
      <p className="muted disclaimer-small">
        These are landmarks, not advice — Bracketeer shows where the walls are; you choose the number.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <tr>
      <td>{label}</td>
      <td>{formatCurrency(value)}</td>
    </tr>
  );
}

function Marker({ label, value }: { label: string; value: number | undefined }) {
  return (
    <li>
      {label}: {value === undefined ? <span className="muted">n/a</span> : <strong>+{formatCurrency(value)}</strong>}
    </li>
  );
}
