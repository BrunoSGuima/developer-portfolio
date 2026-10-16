import { useMatches } from 'react-router';
import type { Section } from '../sections/registry.ts';
import { readHandle } from './routeHandle.ts';

/** The section of the deepest matched route, or undefined (e.g. on the not-found page). */
export function useCurrentSection(): Section | undefined {
  const matches = useMatches();
  return matches.map((match) => readHandle(match).section).findLast((section) => !!section);
}
