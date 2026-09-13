import './themes.css';
import './App.css';

// Phase 0 placeholder shell. The real UI (household/account inputs, the
// year-by-year projection grid, the marginal-rate panel, scenario
// management) is Phase 5 of BRACKETEER_BUILD_PLAN.md, built once the tax
// engine (Phases 1-4) is proven correct on its own, with no UI attached.
export default function App() {
  return (
    <div className="blue-oval-theme app-shell">
      <header className="app-shell__header">
        <img src="/src/renderer/assets/logo.png" alt="" className="app-shell__logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        <h1>Bracketeer</h1>
        <p className="app-shell__tagline">A Roth conversion planner. It calculates — it doesn't recommend.</p>
      </header>
      <main className="app-shell__main">
        <p>
          Engine and UI not yet built. See <code>ROTH_PLANNER_V1_REQUIREMENTS.md</code>{' '}
          and <code>BRACKETEER_BUILD_PLAN.md</code> for the plan.
        </p>
      </main>
      <footer className="app-shell__disclaimer">
        Bracketeer is a modeling tool, not tax or investment advice.
      </footer>
    </div>
  );
}
