import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { projects as staticProjects } from '../../content/projects.ts';
import type { Project } from '../../projects/model.ts';
import { invalidateProjects, type ProjectsData } from '../../projects/source.ts';
import { renderRoute, ROUTE_WAIT } from '../../test/renderRoute.tsx';
import page from '../Page.module.css';
import projectsCss from './ProjectsPage.module.css?raw';
import styles from './ProjectsPage.module.css';
import ProjectsPage from './ProjectsPage.tsx';

vi.mock('../../projects/source.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../projects/source.ts')>();
  return { ...original, invalidateProjects: vi.fn(original.invalidateProjects) };
});

afterEach(() => vi.mocked(invalidateProjects).mockClear());

/** The page in a data router whose loader returns whatever the test needs. */
function renderWithLoader(loader: () => ProjectsData) {
  const router = createMemoryRouter([{ path: '/', Component: ProjectsPage, loader }]);
  return { user: userEvent.setup(), router, ...render(<RouterProvider router={router} />) };
}

/** A rejected promise already marked as handled, like the app's (loadProjects attaches its
 *  eviction handler at once), so the test runner doesn't report it before <Await> sees it. */
function rejected(error: Error): Promise<readonly Project[]> {
  const promise = Promise.reject(error);
  promise.catch(() => undefined);
  return promise;
}

function deferred() {
  let resolve!: (projects: readonly Project[]) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<readonly Project[]>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('ProjectsPage, static build (the default)', () => {
  it('shows the static projects at once, without a loading state', async () => {
    renderRoute('/projects');

    const cards = await screen.findAllByRole('article', undefined, ROUTE_WAIT);
    expect(cards).toHaveLength(staticProjects.length);
    expect(cards[0]).toHaveAccessibleName('Developer Portfolio (this site)');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the same projects in Portuguese', async () => {
    renderRoute('/pt-br/projects');

    expect((await screen.findAllByRole('article', undefined, ROUTE_WAIT))[0]).toHaveAccessibleName(
      'Portfólio de Desenvolvedor (este site)',
    );
  });

  it('explains why professional work is not listed, linking to About', async () => {
    renderRoute('/projects');

    expect(
      await screen.findByText(/private client codebases/, undefined, ROUTE_WAIT),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
  });

  it('keeps the cards in the intro column, directly after the lead (no full-width body)', async () => {
    const { container } = renderRoute('/projects');
    await screen.findAllByRole('article', undefined, ROUTE_WAIT);
    const intro = container.querySelector('[data-slot="page-intro"]')!;

    expect(intro).toContainElement(screen.getByRole('heading', { level: 1, name: 'Projects' }));
    expect(intro).toHaveTextContent(/private client codebases/);
    for (const card of screen.getAllByRole('article')) expect(intro).toContainElement(card);
    expect(container.querySelector('[data-slot="page-body"]')).toBeNull();
  });

  it('shows the three projects in order, each with its status in words', async () => {
    renderRoute('/projects');
    await screen.findAllByRole('article', undefined, ROUTE_WAIT);

    const cards = screen.getAllByRole('article');
    expect(
      cards.map((card) => within(card).getByRole('heading', { level: 2 }).textContent),
    ).toEqual(['Developer Portfolio (this site)', 'Personal Finance App', 'Auction House']);
    expect(
      cards.map((card) => within(card).getByText(/^(Completed|In progress)$/).textContent),
    ).toEqual(['In progress', 'In progress', 'Completed']);
  });

  it('links each public project to its own repository', async () => {
    renderRoute('/projects');

    const portfolio = await screen.findByRole(
      'article',
      {
        name: 'Developer Portfolio (this site)',
      },
      ROUTE_WAIT,
    );
    expect(within(portfolio).getByRole('link', { name: 'Source code' })).toHaveAttribute(
      'href',
      'https://github.com/BrunoSGuima/developer-portfolio',
    );
    const auction = screen.getByRole('article', { name: 'Auction House' });
    expect(within(auction).getByRole('link', { name: 'Source code' })).toHaveAttribute(
      'href',
      'https://github.com/BrunoSGuima/auction-house',
    );
  });

  it('shows no link at all for the private Personal Finance App, and its stack as badges', async () => {
    renderRoute('/projects');

    const finance = await screen.findByRole(
      'article',
      { name: 'Personal Finance App' },
      ROUTE_WAIT,
    );
    expect(within(finance).queryAllByRole('link')).toHaveLength(0);
    expect(within(finance).queryByRole('list', { name: 'Links' })).toBeNull();
    expect(within(finance).getByRole('list', { name: 'Technologies' })).toHaveTextContent(
      /Flutter.*Dart/,
    );
    expect(finance).toHaveTextContent(/multi-agent AI workflow/);
  });

  it('shows the projects in Portuguese with the Portuguese status words', async () => {
    renderRoute('/pt-br/projects');

    const auction = await screen.findByRole('article', { name: 'Casa de Leilões' }, ROUTE_WAIT);
    expect(auction).toHaveTextContent('Concluído');
    expect(within(auction).getByRole('link', { name: 'Código-fonte' })).toHaveAttribute(
      'href',
      'https://github.com/BrunoSGuima/auction-house',
    );
    expect(screen.getByRole('article', { name: 'App de Finanças Pessoais' })).toHaveTextContent(
      'Em andamento',
    );
  });

  it('keeps project cards at a reasonable width however wide the column is', async () => {
    const { container } = renderRoute('/projects');
    await screen.findAllByRole('article', undefined, ROUTE_WAIT);
    const list = container.querySelector('[data-projects] > ul');

    expect(list).toHaveClass(page.cardGridFit!, styles.cards!);
    expect(projectsCss).toMatch(
      /\.cards\s*\{[^}]*--grid-min:\s*20rem;[^}]*--grid-cols:\s*2;[^}]*--grid-max:\s*32rem;/,
    );
  });
});

describe('ProjectsPage, full-stack states', () => {
  it('shows an accessible loading state while the API answers, then the cards', async () => {
    const request = deferred();
    renderWithLoader(() => ({ projects: request.promise }));

    expect(await screen.findByRole('status')).toHaveTextContent('Loading projects…');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();

    act(() => request.resolve(staticProjects));

    expect((await screen.findAllByRole('article'))[0]).toHaveAccessibleName(
      'Developer Portfolio (this site)',
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('says so when there are no projects', async () => {
    renderWithLoader(() => ({ projects: Promise.resolve([]) }));

    expect(await screen.findByText('No projects to show yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows an error with a retry when the API fails, never the static projects', async () => {
    renderWithLoader(() => ({ projects: rejected(new Error('API down')) }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      "The projects couldn't be loaded. Check your connection and try again.",
    );
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('retries with a fresh request (bypassing the cache), keeping focus in the list region', async () => {
    const loader = vi
      .fn<() => ProjectsData>()
      .mockReturnValueOnce({ projects: rejected(new Error('API down')) })
      .mockReturnValue({ projects: Promise.resolve(staticProjects) });
    const { user, container } = renderWithLoader(loader);

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(invalidateProjects).toHaveBeenCalledTimes(1);
    expect(await screen.findAllByRole('article')).toHaveLength(staticProjects.length);
    expect(loader).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[data-projects]')).toHaveFocus();
  });
});
