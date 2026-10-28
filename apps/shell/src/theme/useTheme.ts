import { useSyncExternalStore } from 'react';
import { currentTheme, subscribeTheme, type Theme } from './theme.ts';

/** The theme on the page (ADR-0017); re-renders when it changes. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, currentTheme, () => 'light');
}
