import { useState } from 'react';
import type { Scenario } from '../../shared/types/scenario';
import ScenarioComparison from './ScenarioComparison';

interface Props {
  scenarios: Scenario[];
}

const MAX_COMPARE = 4;

/** A dedicated page for picking scenarios and seeing them compared, side by side — kept fully separate from the Plan tab so comparing never gets tangled up with editing whichever scenario is currently loaded there. */
export default function ComparePage({ scenarios }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id].slice(-MAX_COMPARE)));
  };

  return (
    <>
      <div className="panel">
        <h2>Select scenarios to compare</h2>
        {scenarios.length === 0 ? (
          <p className="muted">No saved scenarios yet — save one from the Plan tab first.</p>
        ) : (
          <>
            <div className="compare-picker">
              {scenarios.map((s) => (
                <label key={s.id} className="compare-picker__item">
                  <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggle(s.id)} />
                  {s.name}
                </label>
              ))}
            </div>
            <p className="muted compare-picker__hint">
              {selectedIds.length === 0
                ? `Check up to ${MAX_COMPARE} scenarios above to compare them.`
                : selectedIds.length === 1
                  ? 'Check at least one more scenario to compare.'
                  : `Comparing ${selectedIds.length} scenario${selectedIds.length > 1 ? 's' : ''}.`}
            </p>
          </>
        )}
      </div>

      <ScenarioComparison scenarios={selectedIds.length >= 2 ? scenarios.filter((s) => selectedIds.includes(s.id)) : []} />
    </>
  );
}
