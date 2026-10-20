import { useCallback, useSyncExternalStore } from 'react';

/** Matches the md breakpoint in tokens.css: the header lane exists from here up. */
export const DESKTOP_QUERY = '(min-width: 48rem)';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

export const useReducedMotion = () => useMediaQuery(REDUCED_MOTION_QUERY);
