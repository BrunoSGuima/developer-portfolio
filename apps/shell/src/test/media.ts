/**
 * Controllable window.matchMedia for jsdom (which has none). Tests default to a desktop
 * viewport with motion allowed; use setMedia() to change either, inside act().
 */

interface MediaState {
  desktop: boolean;
  reducedMotion: boolean;
}

const DEFAULTS: MediaState = { desktop: true, reducedMotion: false };
const state: MediaState = { ...DEFAULTS };
const listeners = new Set<{ query: string; listener: () => void }>();

function evaluate(query: string): boolean {
  if (query.includes('prefers-reduced-motion')) return state.reducedMotion;
  if (query.includes('min-width')) return state.desktop;
  return false;
}

export function installMatchMedia() {
  window.matchMedia = (query: string) =>
    ({
      media: query,
      get matches() {
        return evaluate(query);
      },
      onchange: null,
      addEventListener: (_type: string, listener: () => void) => {
        listeners.add({ query, listener });
      },
      removeEventListener: (_type: string, listener: () => void) => {
        for (const entry of listeners) if (entry.listener === listener) listeners.delete(entry);
      },
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

export function setMedia(next: Partial<MediaState>) {
  Object.assign(state, next);
  for (const { listener } of [...listeners]) listener();
}

export function resetMedia() {
  Object.assign(state, DEFAULTS);
  listeners.clear();
}
