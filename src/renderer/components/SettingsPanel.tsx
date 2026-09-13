import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { THEME_LABELS } from '../utils/themes';

/**
 * Settings: theme picker + the SQLite-location controls the KVG_Standards
 * app-standards skill requires — current path, adopt an existing file,
 * relocate to a new one, reset to default. Those IPC handlers existed in
 * main.ts since Phase 0/5 but had no UI surfacing them until now, which
 * the standard treats as an incomplete rollout, not a stylistic choice.
 */
export default function SettingsPanel() {
  const { currentTheme, setTheme, availableThemes } = useTheme();
  const [dbInfo, setDbInfo] = useState<{ path: string; isDefault: boolean; defaultPath: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const info = await window.bracketeer.dbLocation.get();
    setDbInfo(info);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleBrowseExisting = async () => {
    const path = await window.bracketeer.dbLocation.browseExisting();
    if (!path) return;
    setBusy(true);
    await window.bracketeer.dbLocation.set(path); // triggers app relaunch
  };

  const handleBrowseNew = async () => {
    const path = await window.bracketeer.dbLocation.browseNew();
    if (!path) return;
    setBusy(true);
    await window.bracketeer.dbLocation.set(path); // triggers app relaunch
  };

  const handleReset = async () => {
    setBusy(true);
    await window.bracketeer.dbLocation.resetToDefault(); // triggers app relaunch
  };

  return (
    <div className="panel">
      <h2>Settings</h2>

      <section className="settings-section">
        <h3>Theme</h3>
        <select value={currentTheme ?? ''} onChange={(e) => setTheme(e.target.value as typeof currentTheme)}>
          {availableThemes.map((t) => (
            <option key={t} value={t}>
              {THEME_LABELS[t]}
            </option>
          ))}
        </select>
      </section>

      <section className="settings-section">
        <h3>Database location</h3>
        {dbInfo ? (
          <>
            <p className="db-path">
              {dbInfo.path}
              {dbInfo.isDefault && <span className="muted"> (default location)</span>}
            </p>
            <div className="settings-actions">
              <button onClick={handleBrowseExisting} disabled={busy}>
                Choose existing file&hellip;
              </button>
              <button onClick={handleBrowseNew} disabled={busy}>
                Choose new location&hellip;
              </button>
              <button onClick={handleReset} disabled={busy || dbInfo.isDefault}>
                Reset to default
              </button>
            </div>
            {busy && <p className="muted">Restarting Bracketeer to switch database files&hellip;</p>}
            <p className="muted">Changing the location restarts the app.</p>
          </>
        ) : (
          <p className="muted">Loading&hellip;</p>
        )}
      </section>
    </div>
  );
}
