import type { Scenario } from '../../shared/types/scenario';
import { formatCurrency } from '../format';
import { runProjection } from '../../engine/projection';
import { normalizeHousehold, normalizeYearPlans } from '../defaultScenario';

interface Props {
  scenarios: Scenario[];
}

/** Side-by-side diff of up to three checked scenarios' headline metrics — the comparison ROTH_PLANNER_V1_REQUIREMENTS.md section 3.7 calls the thing the user will build constantly. Fed by whichever scenarios are checked in the sidebar. */
export default function ScenarioComparison({ scenarios }: Props) {
  if (scenarios.length === 0) return null;

  // Normalized (see defaultScenario.ts) so an older scenario saved before a
  // field existed doesn't crash the whole panel, and guarded individually
  // so one unprojectable scenario doesn't take the rest of the table down.
  const summaries = scenarios.flatMap((s) => {
    try {
      const household = normalizeHousehold(s.household);
      const yearPlans = normalizeYearPlans(s.yearPlans);
      return [{ scenario: s, summary: runProjection(household, yearPlans) }];
    } catch {
      return [];
    }
  });

  if (summaries.length === 0) {
    return (
      <div className="panel comparison-table-wrap">
        <h2>Comparison</h2>
        <p className="muted">Could not compute a projection for the selected scenario(s).</p>
      </div>
    );
  }

  return (
    <div className="panel comparison-table-wrap">
      <h2>Comparison</h2>
      <table className="comparison-table">
        <thead>
          <tr>
            <th></th>
            {summaries.map(({ scenario }) => (
              <th key={scenario.id}>{scenario.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Lifetime tax paid</td>
            {summaries.map(({ scenario, summary }) => (
              <td key={scenario.id}>{formatCurrency(summary.lifetimeTaxPaid)}</td>
            ))}
          </tr>
          <tr>
            <td>Terminal after-tax wealth</td>
            {summaries.map(({ scenario, summary }) => (
              <td key={scenario.id}>
                <strong>{formatCurrency(summary.terminalAfterTaxWealth)}</strong>
              </td>
            ))}
          </tr>
          <tr>
            <td>Terminal Roth balance</td>
            {summaries.map(({ scenario, summary }) => (
              <td key={scenario.id}>{formatCurrency(summary.terminalBalances.roth)}</td>
            ))}
          </tr>
          <tr>
            <td>Terminal traditional balance</td>
            {summaries.map(({ scenario, summary }) => (
              <td key={scenario.id}>{formatCurrency(summary.terminalBalances.traditional)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
