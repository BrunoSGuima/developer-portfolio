import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { projects as staticProjects } from '../../content/projects.ts';
import type { Project } from '../../projects/model.ts';
import { invalidateProjects, type ProjectsData } from '../../projects/source.ts';
import { renderRoute } from '../../test/renderRoute.tsx';
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

    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(staticProjects.length);
    expect(cards[0]).toHaveAccessibleName('Developer Portfolio (this site)');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the same projects in Portuguese', async () => {
    renderRoute('/pt-br/projects');

    expect(await screen.findByRole('article')).toHaveAccessibleName(
      'Portfólio de Desenvolvedor (este site)',
    );
  });

  it('explains why professional work is not listed, linking to About', async () => {
    renderRoute('/projects');

    expect(await screen.findByText(/private client codebases/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
  });

  it('keeps the cards in the intro column, directly after the lead (no full-width body)', async () => {
    const { container } = renderRoute('/projects');
    await screen.findByRole('article');
    const intro = container.querySelector('[data-slot="page-intro"]')!;

    expect(intro).toContainElement(screen.getByRole('heading', { level: 1, name: 'Projects' }));
    expect(intro).toHaveTextContent(/private client codebases/);
    expect(intro).toContainElement(screen.getByRole('article'));
    expect(container.querySelector('[data-slot="page-body"]')).toBeNull();
  });

  it('links the portfolio card to the GitHub profile', async () => {
    renderRoute('/projects');

    expect(await screen.findByRole('link', { name: 'GitHub profile' })).toHaveAttribute(
      'href',
      'https://github.com/BrunoSGuima',
    );
  });

  it('keeps project cards at a reasonable width however wide the column is', async () => {
    const { container } = renderRoute('/projects');
    await screen.findByRole('article');
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

    expect(await screen.findByRole('article')).toHaveAccessibleName(
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
    expect(await screen.findByRole('article')).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[data-projects]')).toHaveFocus();
  });
});
