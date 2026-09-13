import { useMemo, useState } from 'react';
import './themes.css';
import './App.css';
import { runProjection } from '../engine/projection';
import type { HouseholdInput, YearPlanInput } from '../engine/projectionTypes';
import type { Scenario } from '../shared/types/scenario';
import { makeDefaultHousehold, makeDefaultYearPlans, reconcileYearPlans } from './defaultScenario';
import HouseholdForm from './components/HouseholdForm';
import ProjectionGrid from './components/ProjectionGrid';
import MarginalRatePanel from './components/MarginalRatePanel';
import ScenarioBar from './components/ScenarioBar';

const initialHousehold = makeDefaultHousehold();

export default function App() {
  const [household, setHousehold] = useState<HouseholdInput>(initialHousehold);
  const [yearPlans, setYearPlans] = useState<YearPlanInput[]>(makeDefaultYearPlans(initialHousehold));
  const [selectedYear, setSelectedYear] = useState<number | null>(initialHousehold.startYear);
  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null);

  const handleHouseholdChange = (next: HouseholdInput) => {
    setHousehold(next);
    setYearPlans((prev) => reconcileYearPlans(next, prev));
  };

  const handleYearPlanChange = (year: number, patch: Partial<YearPlanInput>) => {
    setYearPlans((prev) => prev.map((p) => (p.year === year ? { ...p, ...patch } : p)));
  };

  const handleLoadScenario = (scenario: Scenario) => {
    setHousehold(scenario.household);
    setYearPlans(scenario.yearPlans);
    setCurrentScenarioId(scenario.id);
    setSelectedYear(scenario.household.startYear);
  };

  // Recomputes on every keystroke — this is the "spreadsheet" feel the
  // requirements doc calls for: no separate "run" step, the projection is
  // always the direct consequence of the current inputs.
  const summary = useMemo(() => {
    try {
      return runProjection(household, yearPlans);
    } catch {
      return null;
    }
  }, [household, yearPlans]);

  return (
    <div className="blue-oval-theme app-shell">
      <header className="app-shell__header">
        <h1>Bracketeer</h1>
        <p className="app-shell__tagline">A Roth conversion planner. It calculates — it doesn&rsquo;t recommend.</p>
      </header>

      <main className="app-shell__main">
        <HouseholdForm household={household} onChange={handleHouseholdChange} />

        {summary ? (
          <>
            <ProjectionGrid
              summary={summary}
              yearPlans={yearPlans}
              onYearPlanChange={handleYearPlanChange}
              selectedYear={selectedYear}
              onSelectYear={setSelectedYear}
            />
            <MarginalRatePanel household={household} yearPlans={yearPlans} year={selectedYear} />
          </>
        ) : (
          <div className="panel">
            <p className="muted">Could not compute a projection for the current inputs — check the household form above.</p>
          </div>
        )}

        <ScenarioBar
          currentScenarioId={currentScenarioId}
          household={household}
          yearPlans={yearPlans}
          onLoad={handleLoadScenario}
        />
      </main>

      <footer className="app-shell__disclaimer">
        Bracketeer is a modeling tool, not tax or investment advice. Minnesota tax figures are 2025 estimates —
        verify against the Minnesota Department of Revenue before relying on them for a real decision.
      </footer>
    </div>
  );
}
