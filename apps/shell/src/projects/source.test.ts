import { afterEach, describe, expect, it, vi } from 'vitest';
import { projects as staticProjects } from '../content/projects.ts';

// The API module, replaced: `loaded` records whether any code ever imported it (a static build
// must never).
const api = vi.hoisted(() => ({ loaded: false }));
vi.mock('../api/projects.ts', () => {
  api.loaded = true;
  return { fetchProjects: vi.fn() };
});

const fetchSpy = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchSpy);
afterEach(() => fetchSpy.mockReset());

// The default build: VITE_APP_MODE unset.
const { loadProjects, projectsLoader, staticProjectsLoader } = await import('./source.ts');

describe('the static source (the default build)', () => {
  it('is the one a static build uses', () => {
    expect(projectsLoader).toBe(staticProjectsLoader);
  });

  it('returns the bundled projects as they are: no request, no API code', () => {
    expect(projectsLoader()).toEqual({ projects: staticProjects });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(api.loaded).toBe(false);
  });

  it('refuses to reach the API at all, without importing the API client', async () => {
    await expect(loadProjects(0)).rejects.toThrow('A static build has no API client');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(api.loaded).toBe(false);
  });
});
