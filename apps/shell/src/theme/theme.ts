/**
 * Light and dark themes (Step 4.6a, ADR-0017). The theme lives on <html data-theme>, outside
 * React, so it survives every navigation and language switch:
 *
 * - public/theme-init.js sets it before the first paint (the Content Security Policy allows no
 *   inline script): the visitor's stored choice, else the system preference;
 * - chooseTheme() (the toggle) stores an explicit choice and applies it;
 * - with no stored choice, a change of the system preference applies immediately.
 *
 * theme.test.ts checks that public/theme-init.js uses the same key, values and colours.
 */

export type Theme = 'light' | 'dark';

export const THEMES: readonly Theme[] = ['light', 'dark'];

/** The localStorage key of the visitor's explicit choice. */
export const THEME_KEY = 'theme';

/** <meta name="theme-color"> per theme: the header's surface colour (tokens.css). */
export const THEME_COLORS: Readonly<Record<Theme, string>> = {
  light: '#fcf5ed',
  dark: '#161e30',
};

const SYSTEM_DARK = '(prefers-color-scheme: dark)';

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

/** The visitor's explicit choice, or null (none, invalid, or storage unavailable). */
export function storedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export function systemTheme(): Theme {
  try {
    return window.matchMedia(SYSTEM_DARK).matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** The theme to show: the stored choice, else the system preference. */
export function resolveTheme(): Theme {
  return storedTheme() ?? systemTheme();
}

/** The theme on the page now. */
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

const listeners = new Set<() => void>();

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
  for (const listener of listeners) listener();
}

/** The toggle: remembers the visitor's choice (when storage allows) and applies it. */
export function chooseTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage blocked (e.g. some private modes): the choice still applies to this page view.
  }
  applyTheme(theme);
}

/**
 * Subscribes to theme changes (for useSyncExternalStore). While the visitor hasn't chosen, the
 * system preference is followed live; a choice made in another tab is followed too.
 */
export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);

  let query: MediaQueryList | null = null;
  const followSystem = () => {
    if (storedTheme() === null) applyTheme(systemTheme());
  };
  const followOtherTabs = (event: StorageEvent) => {
    if (event.key === THEME_KEY || event.key === null) applyTheme(resolveTheme());
  };
  try {
    query = window.matchMedia(SYSTEM_DARK);
    query.addEventListener('change', followSystem);
  } catch {
    query = null;
  }
  window.addEventListener('storage', followOtherTabs);

  return () => {
    listeners.delete(listener);
    query?.removeEventListener('change', followSystem);
    window.removeEventListener('storage', followOtherTabs);
  };
}

/** Applies the resolved theme unless theme-init.js already did (it always does in a browser). */
export function ensureTheme(): void {
  if (!isTheme(document.documentElement.dataset.theme)) applyTheme(resolveTheme());
}
