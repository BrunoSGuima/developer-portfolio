import type { UIMatch } from 'react-router';
import type { Section } from '../sections/registry.ts';

/** Metadata attached to routes via `handle`, read by the shell from the matched routes. */
export interface RouteHandle {
  section?: Section;
  /** The not-found page (its title and description come from the interface strings). */
  notFound?: boolean;
}

export function readHandle(match: UIMatch): RouteHandle {
  // Handles are only ever set by buildRoutes(), always with a RouteHandle.
  const handle = match.handle as RouteHandle | undefined;
  return handle ?? {};
}
