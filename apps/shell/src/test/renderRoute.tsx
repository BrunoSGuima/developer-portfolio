import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { buildRoutes } from '../app/routes.tsx';
import { liveSections, type Section } from '../sections/registry.ts';

interface RenderRouteOptions {
  sections?: readonly Section[];
}

/**
 * How long a test waits for a page after rendering or navigating the real route tree: the waits
 * stay condition-based (they end as soon as the page appears), only their budget changes.
 * Measured: 70–300 ms on an idle machine, up to about 2.8 s in the full suite under CPU load
 * (lazy route modules, the shell, user-event steps); Testing Library's default is 1 s.
 */
export const ROUTE_WAIT = { timeout: 5000 } as const;

/** Renders the real route tree in memory, starting at `path`. */
export function renderRoute(path: string, { sections = liveSections }: RenderRouteOptions = {}) {
  const router = createMemoryRouter(buildRoutes(sections), { initialEntries: [path] });
  const user = userEvent.setup();
  return { user, router, ...render(<RouterProvider router={router} />) };
}
