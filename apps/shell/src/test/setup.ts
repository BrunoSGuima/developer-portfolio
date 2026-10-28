import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { installMatchMedia, resetMedia } from './media.ts';

// Browser-environment setup only: tests that run in Node (`// @vitest-environment node`, such as
// vite.config.test.ts) have no window.
if (typeof window !== 'undefined') {
  // jsdom does not implement scrolling; React Router's <ScrollRestoration> calls it on navigation.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

  // jsdom has no matchMedia; the mascot uses it for the breakpoint and reduced motion.
  installMatchMedia();
}

afterEach(() => {
  cleanup();
  resetMedia();
  if (typeof window !== 'undefined') {
    // The theme lives on <html> and in localStorage (ADR-0017): no test may leak it.
    delete document.documentElement.dataset.theme;
    window.localStorage.clear();
  }
});
