import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { liveSections, type Section, shellFunFact } from '../sections/registry.ts';
import { renderRoute } from '../test/renderRoute.tsx';

const SITE_TITLE = 'Bruno Guimarães — Full-Stack Software Engineer';

function funFact() {
  return screen.getByRole('complementary', { name: 'Fun fact' });
}

function mainNav() {
  return screen.getByRole('navigation', { name: 'Main' });
}

/** jsdom has no media queries, so the nav renders collapsed (small-screen layout). */
async function openMenu(user: ReturnType<typeof renderRoute>['user']) {
  await user.click(within(mainNav()).getByRole('button', { name: 'Menu' }));
}

describe('routing', () => {
  it.each(liveSections.map((section) => [section.path, section] as const))(
    '%s renders its section page inside the shell',
    async (path, section) => {
      renderRoute(path);

      const heading = await screen.findByRole('heading', { level: 1 });
      expect(screen.getByRole('main')).toContainElement(heading);
      expect(screen.getByRole('banner')).toBeInTheDocument();
      if (section.path !== '/') {
        expect(heading).toHaveTextContent(section.title);
      }
    },
  );

  it('navigates between sections without remounting the shell', async () => {
    const { user } = renderRoute('/');
    await screen.findByRole('heading', { level: 1, name: /hi, i'm bruno/i });
    const header = screen.getByRole('banner');

    await openMenu(user);
    await user.click(within(mainNav()).getByRole('link', { name: 'Projects' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBe(header);
  });

  it('marks the current section in the nav, matching "/" exactly', async () => {
    const { user } = renderRoute('/about');
    await screen.findByRole('heading', { level: 1, name: 'About' });
    await openMenu(user);

    expect(within(mainNav()).getByRole('link', { name: 'About' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(mainNav()).getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('moves focus to the new page heading after navigation, but not on first load', async () => {
    const { user } = renderRoute('/');
    const homeHeading = await screen.findByRole('heading', { level: 1 });
    expect(homeHeading).not.toHaveFocus();

    await openMenu(user);
    await user.click(within(mainNav()).getByRole('link', { name: 'Architecture' }));

    const heading = await screen.findByRole('heading', { level: 1, name: 'Architecture' });
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it('updates the document title for each section', async () => {
    const { user } = renderRoute('/');
    await screen.findByRole('heading', { level: 1 });
    expect(document.title).toBe(SITE_TITLE);

    await openMenu(user);
    await user.click(within(mainNav()).getByRole('link', { name: 'Contact' }));
    await screen.findByRole('heading', { level: 1, name: 'Contact' });

    expect(document.title).toBe(`Contact · ${SITE_TITLE}`);
  });

  it('shows a not-found page inside the shell for unknown URLs', async () => {
    renderRoute('/does-not-exist');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/');
    expect(document.title).toBe(`Page not found · ${SITE_TITLE}`);
  });

  it('shows an error page inside the shell when a section fails to load', async () => {
    const broken: Section = {
      id: 'broken',
      path: '/broken',
      label: 'Broken',
      title: 'Broken',
      framework: 'react',
      backend: 'none',
      status: 'live',
      mount: { kind: 'react', load: () => Promise.reject(new Error('chunk failed')) },
      funFact: { text: 'Broken section.', tech: ['react'] },
    };

    renderRoute('/broken', { sections: [...liveSections, broken] });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Something went wrong' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });
});

describe('Fun Fact in the shell', () => {
  it.each(liveSections.map((section) => [section.path, section] as const))(
    '%s shows the Fun Fact for its section',
    async (path, section) => {
      renderRoute(path);
      await screen.findByRole('heading', { level: 1 });

      expect(funFact()).toHaveTextContent(section.funFact.text);
    },
  );

  it('keeps the Fun Fact mounted while its content follows navigation', async () => {
    const { user } = renderRoute('/');
    await screen.findByRole('heading', { level: 1 });
    const aside = funFact();

    await openMenu(user);
    await user.click(within(mainNav()).getByRole('link', { name: 'Architecture' }));
    await screen.findByRole('heading', { level: 1, name: 'Architecture' });

    expect(funFact()).toBe(aside);
    expect(aside).toHaveTextContent(/one React app/);
    expect(within(aside).getByText('planned')).toBeInTheDocument();
  });

  it('shows the shell Fun Fact when no section matches', async () => {
    renderRoute('/does-not-exist');
    await screen.findByRole('heading', { level: 1, name: 'Page not found' });

    expect(funFact()).toHaveTextContent(shellFunFact.text);
  });
});
