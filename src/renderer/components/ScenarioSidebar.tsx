import { useEffect, useState } from 'react';
import type { Scenario } from '../../shared/types/scenario';
import type { HouseholdInput, YearPlanInput } from '../../engine/projectionTypes';

interface Props {
  scenarios: Scenario[];
  currentScenarioId: string | null;
  household: HouseholdInput;
  yearPlans: YearPlanInput[];
  onLoad: (scenario: Scenario) => void;
  onNew: () => void;
  onSaved: (scenario: Scenario) => void;
  onRefresh: () => Promise<void>;
}

/**
 * Left-hand scenario navigator — each saved scenario is a tab you click to
 * switch into (onLoad), with New starting a blank slate and Save/Update
 * persisting whatever's currently in the editor. Kept separate from the
 * main editing area so switching/managing scenarios never gets confused
 * with the household/projection controls that operate on whichever one is
 * currently loaded.
 */
export default function ScenarioSidebar({
  scenarios,
  currentScenarioId,
  household,
  yearPlans,
  onLoad,
  onNew,
  onSaved,
  onRefresh,
}: Props) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const current = scenarios.find((s) => s.id === currentScenarioId);
    setName(current?.name ?? '');
  }, [currentScenarioId, scenarios]);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (currentScenarioId) {
      const updated = await window.bracketeer.scenarios.update(currentScenarioId, { name, household, yearPlans });
      if (updated) onSaved(updated);
      setStatus(`Updated "${name}".`);
    } else {
      const created = await window.bracketeer.scenarios.create({ name, household, yearPlans });
      onSaved(created);
      setStatus(`Saved "${created.name}".`);
    }
    await onRefresh();
  };

  const handleDuplicate = async (id: string, currentName: string) => {
    const dup = await window.bracketeer.scenarios.duplicate(id, `${currentName} (copy)`);
    if (dup) setStatus(`Duplicated as "${dup.name}".`);
    await onRefresh();
  };

  const handleDelete = async (id: string) => {
    await window.bracketeer.scenarios.delete(id);
    await onRefresh();
  };

  return (
    <aside className="scenario-sidebar">
      <div className="scenario-sidebar__header">
        <h2>Scenarios</h2>
        <button
          title="Start a brand-new scenario from a blank slate, without touching any saved scenario."
          onClick={onNew}
        >
          + New
        </button>
      </div>

      <ul className="scenario-tabs">
        {scenarios.map((s) => (
          <li key={s.id} className={s.id === currentScenarioId ? 'is-active' : ''}>
            <button className="scenario-tab" onClick={() => onLoad(s)} title={`Switch to "${s.name}"`}>
              {s.name}
            </button>
            <span className="scenario-tab__actions">
              <button title="Duplicate this scenario" onClick={() => handleDuplicate(s.id, s.name)}>
                ⧉
              </button>
              <button title="Delete this scenario" onClick={() => handleDelete(s.id)}>
                ✕
              </button>
            </span>
          </li>
        ))}
        {scenarios.length === 0 && <li className="muted">No saved scenarios yet.</li>}
      </ul>

      <div className="scenario-sidebar__save">
        <input
          placeholder="Scenario name"
          title="The name this scenario is saved under."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={handleSave} disabled={!name.trim()}>
          {currentScenarioId ? 'Update' : 'Save'}
        </button>
      </div>
      {status && <p className="muted scenario-sidebar__status">{status}</p>}
    </aside>
  );
}
