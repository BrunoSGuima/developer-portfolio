import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { projects as staticProjects } from '../content/projects.ts';
import type { Project } from './model.ts';

// The API module, replaced so each test controls every request. `loaded` records whether any
// code ever imported it (a static build must never).
const api = vi.hoisted(() => ({ loaded: false, fetchProjects: vi.fn() }));
vi.mock('../api/projects.ts', () => {
  api.loaded = true;
  return { fetchProjects: api.fetchProjects };
});

const fetchSpy = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchSpy);

// A full-stack build: the env value the build would bake in (vite.config.ts), set before the
// module loads.
vi.stubEnv('VITE_APP_MODE', 'fullstack');
const source = await import('./source.ts');
const { PROJECTS_TTL_MS, apiProjectsLoader, invalidateProjects, loadProjects, projectsLoader } =
  source;

const one: readonly Project[] = staticProjects;
const two: readonly Project[] = [];

function controlled() {
  let resolve!: (value: readonly Project[]) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<readonly Project[]>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  invalidateProjects();
  api.fetchProjects.mockReset();
});
afterEach(() => fetchSpy.mockReset());

describe('the API source (full-stack builds)', () => {
  it('is the one a full-stack build uses', () => {
    expect(projectsLoader).toBe(apiProjectsLoader);
  });

  it("returns the request unawaited, so navigation needn't wait", async () => {
    api.fetchProjects.mockResolvedValue(one);

    const { projects } = apiProjectsLoader();

    expect(projects).toBeInstanceOf(Promise);
    await expect(projects).resolves.toBe(one);
    expect(api.fetchProjects).toHaveBeenCalledWith();
  });

  it('reuses a response for 5 minutes, then asks again', async () => {
    api.fetchProjects.mockResolvedValueOnce(one).mockResolvedValueOnce(two);

    await expect(loadProjects(0)).resolves.toBe(one);
    await expect(loadProjects(PROJECTS_TTL_MS - 1)).resolves.toBe(one);
    expect(api.fetchProjects).toHaveBeenCalledTimes(1);

    await expect(loadProjects(PROJECTS_TTL_MS)).resolves.toBe(two);
    expect(api.fetchProjects).toHaveBeenCalledTimes(2);
  });

  it('shares one request in flight between loads', async () => {
    const request = controlled();
    api.fetchProjects.mockReturnValue(request.promise);

    const first = loadProjects(0);
    const second = loadProjects(1000);
    request.resolve(one);

    expect(await second).toBe(await first);
    expect(api.fetchProjects).toHaveBeenCalledTimes(1);
  });

  it('never caches a failure: the next load asks again', async () => {
    api.fetchProjects.mockRejectedValueOnce(new Error('API down')).mockResolvedValueOnce(one);

    await expect(loadProjects(0)).rejects.toThrow('API down');
    await expect(loadProjects(1)).resolves.toBe(one);
    expect(api.fetchProjects).toHaveBeenCalledTimes(2);
  });

  it('makes a fresh request after invalidateProjects (Retry), even with a cached success', async () => {
    api.fetchProjects.mockResolvedValueOnce(one).mockResolvedValueOnce(two);
    await loadProjects(0);

    invalidateProjects();

    await expect(loadProjects(1)).resolves.toBe(two);
    expect(api.fetchProjects).toHaveBeenCalledTimes(2);
  });

  it("doesn't let an older request overwrite a newer one, or evict it by failing late", async () => {
    const older = controlled();
    const newer = controlled();
    api.fetchProjects.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);

    const olderLoad = loadProjects(0);
    olderLoad.catch(() => undefined);
    invalidateProjects();
    const newerLoad = loadProjects(1);
    newer.resolve(two);
    await newerLoad;

    older.reject(new Error('late failure'));
    await expect(olderLoad).rejects.toThrow('late failure');

    await expect(loadProjects(2)).resolves.toBe(two);
    expect(api.fetchProjects).toHaveBeenCalledTimes(2);
  });

  it('loads the API module only for API requests', async () => {
    api.fetchProjects.mockResolvedValue(one);
    await loadProjects(0);

    expect(api.loaded).toBe(true);
  });
});
