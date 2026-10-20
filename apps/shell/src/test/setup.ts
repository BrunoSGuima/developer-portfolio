import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { installMatchMedia, resetMedia } from './media.ts';

// jsdom does not implement scrolling; React Router's <ScrollRestoration> calls it on navigation.
vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

// jsdom has no matchMedia; the mascot uses it for the breakpoint and reduced motion.
installMatchMedia();

afterEach(() => {
  cleanup();
  resetMedia();
});
