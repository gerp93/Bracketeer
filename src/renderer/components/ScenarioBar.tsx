import { useEffect, useState } from 'react';
import type { Scenario } from '../../shared/types/scenario';
import type { HouseholdInput, YearPlanInput } from '../../engine/projectionTypes';
import { formatCurrency } from '../format';
import { runProjection } from '../../engine/projection';

interface Props {
  currentScenarioId: string | null;
  household: HouseholdInput;
  yearPlans: YearPlanInput[];
  onLoad: (scenario: Scenario) => void;
}

/** Save/load/duplicate/delete named scenarios, and a lightweight side-by-side diff of their summary metrics — the comparison ROTH_PLANNER_V1_REQUIREMENTS.md section 3.7 calls the thing the user will build constantly. */
export default function ScenarioBar({ currentScenarioId, household, yearPlans, onLoad }: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [name, setName] = useState('');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('');

  const refresh = async () => {
    const all = await window.bracketeer.scenarios.getAll();
    setScenarios(all);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (currentScenarioId) {
      await window.bracketeer.scenarios.update(currentScenarioId, { name, household, yearPlans });
      setStatus(`Updated "${name}".`);
    } else {
      const created = await window.bracketeer.scenarios.create({ name, household, yearPlans });
      setStatus(`Saved "${created.name}".`);
    }
    setName('');
    await refresh();
  };

  const handleDuplicate = async (id: string, currentName: string) => {
    const dup = await window.bracketeer.scenarios.duplicate(id, `${currentName} (copy)`);
    if (dup) setStatus(`Duplicated as "${dup.name}".`);
    await refresh();
  };

  const handleDelete = async (id: string) => {
    await window.bracketeer.scenarios.delete(id);
    setCompareIds((ids) => ids.filter((i) => i !== id));
    await refresh();
  };

  const toggleCompare = (id: string) => {
    setCompareIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id].slice(-3)));
  };

  return (
    <div className="panel">
      <h2>Scenarios</h2>
      <div className="scenario-save-row">
        <input placeholder="Scenario name" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={handleSave}>{currentScenarioId ? 'Update loaded scenario' : 'Save as new scenario'}</button>
      </div>
      {status && <p className="muted">{status}</p>}

      <ul className="scenario-list">
        {scenarios.map((s) => (
          <li key={s.id} className={s.id === currentScenarioId ? 'is-current' : ''}>
            <label>
              <input type="checkbox" checked={compareIds.includes(s.id)} onChange={() => toggleCompare(s.id)} />
              {s.name}
            </label>
            <span className="scenario-actions">
              <button onClick={() => onLoad(s)}>Load</button>
              <button onClick={() => handleDuplicate(s.id, s.name)}>Duplicate</button>
              <button onClick={() => handleDelete(s.id)}>Delete</button>
            </span>
          </li>
        ))}
        {scenarios.length === 0 && <li className="muted">No saved scenarios yet.</li>}
      </ul>

      {compareIds.length > 0 && <ComparisonTable scenarios={scenarios.filter((s) => compareIds.includes(s.id))} />}
    </div>
  );
}

function ComparisonTable({ scenarios }: { scenarios: Scenario[] }) {
  const summaries = scenarios.map((s) => ({ scenario: s, summary: runProjection(s.household, s.yearPlans) }));

  return (
    <div className="comparison-table-wrap">
      <h3>Comparison</h3>
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
