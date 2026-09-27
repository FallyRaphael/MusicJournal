import { useCallback, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

/** Must match the key read by the inline script in index.html. */
const STORAGE_KEY = 'pj-theme';

/** Browser UI colour (Android status bar) per theme; matches `--bg` in tokens.css. */
const THEME_COLORS = { light: '#f4f5f2', dark: '#111418' } as const;

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

// The theme is a device preference, so it lives in localStorage rather than in the
// database (and isn't part of backups). Storage access can throw, e.g. in private mode.
export function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark') return value;
  } catch {
    // Fall back to the system setting.
  }
  return 'system';
}

function saveThemePreference(preference: ThemePreference): void {
  try {
    if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Not persisted; still applied for this visit.
  }
}

function applyTheme(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === 'system') delete root.dataset.theme;
  else root.dataset.theme = preference;

  const effective = preference === 'system' ? (darkQuery().matches ? 'dark' : 'light') : preference;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[effective]);
}

/** Applies the saved theme and follows system changes while "system" is selected. */
export function initTheme(): void {
  applyTheme(readThemePreference());
  darkQuery().addEventListener('change', () => applyTheme(readThemePreference()));
}

export function useThemePreference(): [ThemePreference, (preference: ThemePreference) => void] {
  const [preference, setPreference] = useState(readThemePreference);
  const update = useCallback((next: ThemePreference) => {
    saveThemePreference(next);
    applyTheme(next);
    setPreference(next);
  }, []);
  return [preference, update];
}
