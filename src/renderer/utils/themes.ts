// Ported from Sweeper's src/renderer/utils/themes.ts — the reference
// pattern for exposing VisualAssault's full theme catalog with a picker,
// not just hardcoding one theme class. Keep the stylized entries in sync
// with VisualAssault's themes.css (vendored @ v0.2.0) if that package adds
// themes. 'light-theme'/'dark-theme' are Bracketeer-only additions, not
// from VisualAssault — see localThemes.css for why.
export const AVAILABLE_THEMES = [
  'dark-theme',
  'light-theme',
  'blue-oval-theme',
  'bubblegum-theme',
  'commander-keen-theme',
  'electric-lime-theme',
  'flambeau-theme',
  'flambeau-inverse-theme',
  'green-acres-theme',
  'hacker-theme',
  'hawkeye-theme',
  'lava-theme',
  'merica-theme',
  'neon-theme',
  'red-barn-theme',
  'retrowave-theme',
] as const;

export type Theme = (typeof AVAILABLE_THEMES)[number];

/** Default for anyone who's never picked a theme — a first-time download starts in Dark. */
export const DEFAULT_THEME: Theme = 'dark-theme';

export const THEME_LABELS: Record<Theme, string> = {
  'dark-theme': 'Dark',
  'light-theme': 'Light',
  'blue-oval-theme': 'Blue Oval',
  'bubblegum-theme': 'Bubblegum',
  'commander-keen-theme': 'Commander Keen',
  'electric-lime-theme': 'Electric Lime',
  'flambeau-theme': 'Flambeau',
  'flambeau-inverse-theme': 'Flambeau Inverse',
  'green-acres-theme': 'Green Acres',
  'hacker-theme': 'Hacker',
  'hawkeye-theme': 'Hawkeye',
  'lava-theme': 'Lava',
  'merica-theme': 'Merica',
  'neon-theme': 'Neon',
  'red-barn-theme': 'Red Barn',
  'retrowave-theme': 'Retrowave',
};

const STORAGE_KEY = 'bracketeer-theme';

export function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && AVAILABLE_THEMES.includes(stored as Theme)) {
      return stored as Theme;
    }
  } catch {
    // localStorage not available (e.g. a locked-down preview context) — fall through to no theme.
  }
  return null;
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

/** Applies the theme class to document.body — not a wrapper div — so it covers the whole viewport including anything portaled to body. */
export function applyTheme(theme: Theme | null): void {
  const body = document.body;
  AVAILABLE_THEMES.forEach((t) => body.classList.remove(t));
  if (theme) body.classList.add(theme);
}
