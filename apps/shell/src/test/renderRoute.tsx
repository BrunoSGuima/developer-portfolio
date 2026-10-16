import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { buildRoutes } from '../app/routes.tsx';
import { liveSections, type Section } from '../sections/registry.ts';

interface RenderRouteOptions {
  sections?: readonly Section[];
}

/** Renders the real route tree in memory, starting at `path`. */
export function renderRoute(path: string, { sections = liveSections }: RenderRouteOptions = {}) {
  const router = createMemoryRouter(buildRoutes(sections), { initialEntries: [path] });
  const user = userEvent.setup();
  return { user, router, ...render(<RouterProvider router={router} />) };
}
