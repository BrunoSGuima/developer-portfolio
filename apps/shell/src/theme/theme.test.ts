import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import initScript from '../../public/theme-init.js?raw';
import { setMedia } from '../test/media.ts';
import {
  applyTheme,
  chooseTheme,
  currentTheme,
  ensureTheme,
  resolveTheme,
  storedTheme,
  subscribeTheme,
  THEME_COLORS,
  THEME_KEY,
  THEMES,
} from './theme.ts';

const html = document.documentElement;

beforeEach(() => {
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = THEME_COLORS.light;
  document.head.append(meta);
});

afterEach(() => {
  document.head.querySelector('meta[name="theme-color"]')?.remove();
  vi.restoreAllMocks();
});

const themeColor = () =>
  document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content');

/** Runs public/theme-init.js as the browser does, before the app. */
function runInitScript() {
  // The real file, evaluated as a classic script (it's served untouched from public/).
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- a test of that exact file
  (new Function(initScript) as () => void)();
}

describe('resolving the theme', () => {
  it('follows the system preference while nothing is stored', () => {
    expect(resolveTheme()).toBe('light');
    setMedia({ darkScheme: true });
    expect(resolveTheme()).toBe('dark');
  });

  it("prefers the visitor's stored choice over the system", () => {
    setMedia({ darkScheme: true });
    window.localStorage.setItem(THEME_KEY, 'light');
    expect(resolveTheme()).toBe('light');
  });

  it('ignores an invalid stored value', () => {
    window.localStorage.setItem(THEME_KEY, 'sepia');
    setMedia({ darkScheme: true });
    expect(storedTheme()).toBeNull();
    expect(resolveTheme()).toBe('dark');
  });

  it('copes with blocked storage: the system decides, and a choice still applies', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    setMedia({ darkScheme: true });

    expect(resolveTheme()).toBe('dark');
    chooseTheme('light');
    expect(currentTheme()).toBe('light');
  });
});

describe('applying and choosing', () => {
  it('sets <html data-theme> and the browser theme colour', () => {
    applyTheme('dark');
    expect(html.dataset.theme).toBe('dark');
    expect(themeColor()).toBe(THEME_COLORS.dark);

    applyTheme('light');
    expect(html.dataset.theme).toBe('light');
    expect(themeColor()).toBe(THEME_COLORS.light);
  });

  it('stores an explicit choice', () => {
    chooseTheme('dark');
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(currentTheme()).toBe('dark');
  });

  it('applies the resolved theme only when none is set yet', () => {
    setMedia({ darkScheme: true });
    ensureTheme();
    expect(currentTheme()).toBe('dark');

    html.dataset.theme = 'light';
    ensureTheme();
    expect(currentTheme()).toBe('light');
  });
});

describe('following changes', () => {
  it('follows a system change live while the visitor has not chosen', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTheme(listener);
    applyTheme('light');

    act(() => setMedia({ darkScheme: true }));
    expect(currentTheme()).toBe('dark');
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it("keeps the visitor's choice when the system changes", () => {
    const unsubscribe = subscribeTheme(() => undefined);
    chooseTheme('light');

    act(() => setMedia({ darkScheme: true }));
    expect(currentTheme()).toBe('light');
    unsubscribe();
  });

  it('follows a choice made in another tab', () => {
    const unsubscribe = subscribeTheme(() => undefined);
    applyTheme('light');

    window.localStorage.setItem(THEME_KEY, 'dark');
    window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY }));
    expect(currentTheme()).toBe('dark');
    unsubscribe();
  });
});

describe('public/theme-init.js (runs before the first paint)', () => {
  it('uses the same key, themes and colours as theme.ts', () => {
    expect(initScript).toContain(`getItem('${THEME_KEY}')`);
    for (const theme of THEMES) {
      expect(initScript).toContain(`'${theme}'`);
      expect(initScript).toContain(THEME_COLORS[theme]);
    }
    expect(initScript).toContain('(prefers-color-scheme: dark)');
  });

  it.each([
    { stored: null, systemDark: false, expected: 'light' },
    { stored: null, systemDark: true, expected: 'dark' },
    { stored: 'dark', systemDark: false, expected: 'dark' },
    { stored: 'light', systemDark: true, expected: 'light' },
    { stored: 'sepia', systemDark: true, expected: 'dark' },
  ] as const)(
    'stored $stored, system dark $systemDark → $expected, like resolveTheme()',
    ({ stored, systemDark, expected }) => {
      if (stored) window.localStorage.setItem(THEME_KEY, stored);
      setMedia({ darkScheme: systemDark });

      runInitScript();

      expect(html.dataset.theme).toBe(expected);
      expect(resolveTheme()).toBe(expected);
      expect(themeColor()).toBe(THEME_COLORS[expected]);
    },
  );

  it('falls back to the system preference, then light, when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    setMedia({ darkScheme: true });
    runInitScript();
    expect(html.dataset.theme).toBe('dark');
  });

  it('is a plain, dependency-free classic script (no import, no export)', () => {
    expect(initScript).not.toMatch(/^\s*(import|export)\b/m);
  });
});
