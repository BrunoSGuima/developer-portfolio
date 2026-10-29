import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { projectListResponse } from '../../api/fixtures.ts';
import { invalidateProjects } from '../../projects/source.ts';
import { renderRoute, ROUTE_WAIT } from '../../test/renderRoute.tsx';

// The Projects page through the real routes, as built in full-stack mode: data from the API
// (fetch stubbed), the full-stack Fun Fact, and no fallback to the static data on failure.
vi.mock('../../config/mode.ts', () => ({
  APP_MODES: ['static', 'fullstack'],
  appMode: 'fullstack',
  isFullStack: true,
}));

// The env value a full-stack build bakes in (vite.config.ts); read when the API is first used.
vi.stubEnv('VITE_APP_MODE', 'fullstack');

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchMock);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => invalidateProjects());
afterEach(() => fetchMock.mockReset());

describe('ProjectsPage, full-stack build', () => {
  it('loads the projects from the API, same-origin', async () => {
    fetchMock.mockResolvedValue(json(projectListResponse));

    renderRoute('/projects');

    const card = await screen.findByRole(
      'article',
      { name: 'Developer Portfolio (this site)' },
      ROUTE_WAIT,
    );
    expect(within(card).getByRole('link', { name: 'Source code' })).toHaveAttribute(
      'href',
      'https://example.com/source',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/projects');
  });

  it('shows the full-stack Fun Fact, with the Rails and PostgreSQL badges', async () => {
    fetchMock.mockResolvedValue(json(projectListResponse));

    renderRoute('/projects');

    const funFact = await screen.findByRole('complementary', { name: 'Fun fact' }, ROUTE_WAIT);
    expect(funFact).toHaveTextContent(/come from a Ruby on Rails API backed by PostgreSQL/);
    const badges = within(funFact).getByRole('list', { name: 'Technologies' });
    expect(within(badges).getByText('Ruby on Rails')).toBeInTheDocument();
    expect(within(badges).getByText('PostgreSQL')).toBeInTheDocument();
  });

  it('shows the error state when the API fails, never the static projects', async () => {
    fetchMock.mockResolvedValue(
      json(
        { error: { code: 'internal_error', message: 'Internal Server Error', details: {} } },
        500,
      ),
    );

    renderRoute('/projects');

    expect(await screen.findByRole('alert', undefined, ROUTE_WAIT)).toHaveTextContent(
      "The projects couldn't be loaded.",
    );
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('shows the error state when the API is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    renderRoute('/pt-br/projects');

    expect(await screen.findByRole('alert', undefined, ROUTE_WAIT)).toHaveTextContent(
      'Não foi possível carregar os projetos.',
    );
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('recovers with Try again, making a fresh request', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    fetchMock.mockResolvedValueOnce(json(projectListResponse));
    const { user } = renderRoute('/projects');

    await user.click(await screen.findByRole('button', { name: 'Try again' }, ROUTE_WAIT));

    expect(await screen.findByRole('article', undefined, ROUTE_WAIT)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
