import { isFullStack } from '../config/mode.ts';
import { projects as staticProjects } from '../content/projects.ts';
import type { Project } from './model.ts';

/**
 * Where the Projects page gets its projects (ADR-0014), chosen by the build's mode:
 *
 * - static: the typed data bundled with the page (content/projects.ts); no API, no request.
 * - full-stack: the Rails API, through the typed client, imported only here and only in a
 *   full-stack build, so a static build contains no API client code. An API failure rejects the
 *   promise (the page shows its error state); it never falls back to the static data.
 *
 * The loader returns the projects unawaited (a deferred promise in full-stack mode), so
 * navigation completes at once and the page renders its loading state.
 */
export interface ProjectsData {
  projects: readonly Project[] | Promise<readonly Project[]>;
}

/** How long a successful full-stack response is reused for normal navigation. */
export const PROJECTS_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  id: number;
  startedAt: number;
  promise: Promise<readonly Project[]>;
}

let entry: CacheEntry | null = null;
let lastId = 0;

// The API module: a separate chunk, imported once and reused. The literal comparison (the same
// one as config/mode.ts) must stay at the import site: Vite replaces it before bundling, so a
// static build removes the import itself and emits no API chunk at all (static-mode E2E checks).
let apiModule: Promise<typeof import('../api/projects.ts')> | undefined;
const loadApiModule = () =>
  (apiModule ??=
    import.meta.env.VITE_APP_MODE === 'fullstack'
      ? import('../api/projects.ts')
      : Promise.reject(new Error('A static build has no API client (VITE_APP_MODE=static).')));

/**
 * The projects from the API, reusing the current request (or its result) for 5 minutes. Each
 * new request replaces the entry, and results are never written back, so an older request still
 * in flight can't overwrite a newer one; a failure evicts its own entry only. The request isn't
 * tied to one navigation's abort signal, so leaving the page mid-request doesn't spoil the cache.
 */
export function loadProjects(now: number = Date.now()): Promise<readonly Project[]> {
  if (entry && now - entry.startedAt < PROJECTS_TTL_MS) return entry.promise;

  const id = ++lastId;
  const promise = loadApiModule().then(({ fetchProjects }) => fetchProjects());
  entry = { id, startedAt: now, promise };
  promise.catch(() => {
    if (entry?.id === id) entry = null;
  });
  return promise;
}

/** Forgets the cached projects, so the next load makes a fresh request (the Retry action). */
export function invalidateProjects(): void {
  entry = null;
}

export function staticProjectsLoader(): ProjectsData {
  return { projects: staticProjects };
}

export function apiProjectsLoader(): ProjectsData {
  return { projects: loadProjects() };
}

export const projectsLoader = isFullStack ? apiProjectsLoader : staticProjectsLoader;
