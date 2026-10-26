import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProjectCard from '../components/ProjectCard/ProjectCard.tsx';
import { projects as staticProjects } from '../content/projects.ts';
import type { Project } from '../projects/model.ts';
import { ApiError } from './client.ts';
import { projectListResponse, projectResponse } from './fixtures.ts';
import { fetchProjects, toProject } from './projects.ts';

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchMock);
afterEach(() => fetchMock.mockReset());

const apiProject = projectResponse;

describe('toProject', () => {
  it('maps an API project to the shell Project model', () => {
    expect(toProject(apiProject)).toEqual({
      id: 'developer-portfolio',
      name: {
        en: 'Developer Portfolio (this site)',
        'pt-BR': 'Portfólio de Desenvolvedor (este site)',
      },
      description: { en: 'An interactive portfolio.', 'pt-BR': 'Um portfólio interativo.' },
      status: 'in-progress',
      tech: ['react', 'typescript', 'vite', 'react-router'],
      links: [
        {
          label: { en: 'GitHub profile', 'pt-BR': 'Perfil no GitHub' },
          href: 'https://github.com/BrunoSGuima',
        },
        {
          label: { en: 'Source code', 'pt-BR': 'Código-fonte' },
          href: 'https://example.com/source',
        },
      ],
    } satisfies Project);
  });

  it('produces the same model the static data uses, so ProjectCard renders either', () => {
    // Both sources type-check as Project (projects/model.ts); the card needs nothing else.
    const fromApi: Project = toProject(apiProject);
    const fromStatic: Project | undefined = staticProjects[0];

    render(<ProjectCard project={fromApi} />);

    const card = screen.getByRole('article', { name: 'Developer Portfolio (this site)' });
    expect(within(card).getByText('In progress')).toBeInTheDocument();
    expect(
      within(within(card).getByRole('list', { name: 'Technologies' })).getAllByRole('listitem'),
    ).toHaveLength(4);
    expect(within(card).getByRole('link', { name: 'GitHub profile' })).toHaveAttribute(
      'href',
      'https://github.com/BrunoSGuima',
    );
    expect(Object.keys(fromApi).sort()).toEqual(Object.keys(fromStatic ?? {}).sort());
  });
});

describe('fetchProjects', () => {
  it('loads and maps the published projects, in order, passing the signal on', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(projectListResponse), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const controller = new AbortController();

    const projects = await fetchProjects({ signal: controller.signal });

    expect(projects).toEqual(projectListResponse.data.map(toProject));
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });

  it('keeps an empty list empty', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"data":[]}', { headers: { 'Content-Type': 'application/json' } }),
    );

    await expect(fetchProjects()).resolves.toEqual([]);
  });

  it('rejects a response without a data list', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"projects":[]}', { headers: { 'Content-Type': 'application/json' } }),
    );

    const error: unknown = await fetchProjects().catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'invalid_response', status: 200 });
  });
});
