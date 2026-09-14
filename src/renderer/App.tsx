import { useEffect, useMemo, useState } from 'react';
import './themes.css';
import './App.css';
import { runProjection } from '../engine/projection';
import type { HouseholdInput, YearPlanInput } from '../engine/projectionTypes';
import type { Scenario } from '../shared/types/scenario';
import {
  makeDefaultHousehold,
  makeDefaultYearPlans,
  normalizeHousehold,
  normalizeYearPlans,
  reconcileYearPlans,
} from './defaultScenario';
import { ThemeProvider } from './context/ThemeContext';
import HouseholdForm from './components/HouseholdForm';
import ProjectionGrid from './components/ProjectionGrid';
import MarginalRatePanel from './components/MarginalRatePanel';
import ScenarioSidebar from './components/ScenarioSidebar';
import ComparePage from './components/ComparePage';
import SettingsPanel from './components/SettingsPanel';

type Tab = 'plan' | 'compare' | 'settings';

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

function AppShell() {
  const [household, setHousehold] = useState<HouseholdInput>(() => makeDefaultHousehold());
  const [yearPlans, setYearPlans] = useState<YearPlanInput[]>(() => makeDefaultYearPlans(household));
  const [selectedYear, setSelectedYear] = useState<number | null>(household.startYear);
  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('plan');

  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  const refreshScenarios = async () => {
    setScenarios(await window.bracketeer.scenarios.getAll());
  };

  useEffect(() => {
    refreshScenarios();
  }, []);

  const handleHouseholdChange = (next: HouseholdInput) => {
    setHousehold(next);
    setYearPlans((prev) => reconcileYearPlans(next, prev));
  };

  const handleYearPlanChange = (year: number, patch: Partial<YearPlanInput>) => {
    setYearPlans((prev) => prev.map((p) => (p.year === year ? { ...p, ...patch } : p)));
  };

  const handleLoadScenario = (scenario: Scenario) => {
    const household = normalizeHousehold(scenario.household);
    setHousehold(household);
    setYearPlans(normalizeYearPlans(scenario.yearPlans));
    setCurrentScenarioId(scenario.id);
    setSelectedYear(household.startYear);
    setTab('plan');
  };

  const handleNewScenario = () => {
    const fresh = makeDefaultHousehold();
    setHousehold(fresh);
    setYearPlans(makeDefaultYearPlans(fresh));
    setCurrentScenarioId(null);
    setSelectedYear(fresh.startYear);
    setTab('plan');
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
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__title-row">
          <h1>Bracketeer</h1>
          <nav className="app-shell__tabs">
            <button className={tab === 'plan' ? 'is-active' : ''} onClick={() => setTab('plan')}>
              Plan
            </button>
            <button className={tab === 'compare' ? 'is-active' : ''} onClick={() => setTab('compare')}>
              Compare
            </button>
            <button className={tab === 'settings' ? 'is-active' : ''} onClick={() => setTab('settings')}>
              Settings
            </button>
          </nav>
        </div>
        <p className="app-shell__tagline">
          A year-by-year look at what a Roth conversion really costs — you decide, it just does the math.
        </p>
      </header>

      <div className="app-shell__body">
        {tab === 'plan' && (
          <ScenarioSidebar
            scenarios={scenarios}
            currentScenarioId={currentScenarioId}
            household={household}
            yearPlans={yearPlans}
            onLoad={handleLoadScenario}
            onNew={handleNewScenario}
            onSaved={(scenario) => setCurrentScenarioId(scenario.id)}
            onRefresh={refreshScenarios}
          />
        )}

        <main className="app-shell__main">
          {tab === 'settings' && <SettingsPanel />}

          {tab === 'compare' && <ComparePage scenarios={scenarios} />}

          {tab === 'plan' && (
            <>
              <HouseholdForm household={household} onChange={handleHouseholdChange} />

              {summary ? (
                <ProjectionGrid
                  summary={summary}
                  yearPlans={yearPlans}
                  onYearPlanChange={handleYearPlanChange}
                  selectedYear={selectedYear}
                  onSelectYear={setSelectedYear}
                />
              ) : (
                <div className="panel">
                  <p className="muted">
                    Could not compute a projection for the current inputs — check the household form above.
                  </p>
                </div>
              )}
            </>
          )}
        </main>

        {tab === 'plan' && selectedYear !== null && summary && (
          <div className="marginal-drawer">
            <button
              type="button"
              className="marginal-drawer__close"
              aria-label="Close"
              onClick={() => setSelectedYear(null)}
            >
              ✕
            </button>
            <MarginalRatePanel household={household} yearPlans={yearPlans} year={selectedYear} />
          </div>
        )}
      </div>

      <footer className="app-shell__disclaimer">
        <strong>Bracketeer is a modeling and educational tool only.</strong> It does not provide tax, legal,
        financial, or investment advice, and nothing it displays is a recommendation to convert any amount in any
        year — every number here is a projection based on assumptions you control, not a guarantee. Federal tax,
        IRMAA, and Minnesota tax figures reflect 2025 rules and may be estimated, incomplete, or outdated. Verify all
        figures against the IRS, the Minnesota Department of Revenue, the Social Security Administration, and a
        qualified tax or financial professional before making any real-world financial decision. Use of this tool is
        at your own risk; its authors accept no liability for decisions made based on its output.
      </footer>
    </div>
  );
}
