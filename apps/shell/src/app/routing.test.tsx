import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { liveSections, type Section, shellFunFact } from '../sections/registry.ts';
import { deferred, settle } from '../test/deferred.ts';
import { setMedia } from '../test/media.ts';
import { createFakeSectionApp } from '../test/fakeSectionApp.ts';
import { same } from '../test/localized.ts';
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
        expect(heading).toHaveTextContent(section.title.en);
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
      label: same('Broken'),
      title: same('Broken'),
      description: same('A broken section.'),
      framework: 'react',
      backend: 'none',
      status: 'live',
      mount: { kind: 'react', load: () => Promise.reject(new Error('chunk failed')) },
      funFact: { text: same('Broken section.'), tech: ['react'] },
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

      expect(funFact()).toHaveTextContent(section.funFact.text.en);
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

    expect(funFact()).toHaveTextContent(shellFunFact.text.en);
  });
});

/** A test-only section mounted through the microfrontend contract (no real one exists yet). */
function remoteSection(load: () => Promise<unknown>): Section {
  return {
    id: 'remote',
    path: '/remote',
    label: same('Remote'),
    title: same('Remote'),
    description: same('A fake remote section.'),
    framework: 'vue',
    backend: 'none',
    status: 'live',
    mount: { kind: 'remote', entry: '/apps/remote/entry.js', load },
    funFact: { text: same('This fake section is mounted through the contract.'), tech: ['vue'] },
  };
}

function renderWithRemote(path: string, load: () => Promise<unknown>) {
  return renderRoute(path, { sections: [...liveSections, remoteSection(load)] });
}

const fakeViews = () => document.querySelectorAll('[data-fake-app]');

describe('remote sections in the shell', () => {
  it('mounts inside the persistent shell, with its own Fun Fact and title', async () => {
    const { load } = createFakeSectionApp();
    const { router } = renderWithRemote('/', load);
    await screen.findByRole('heading', { level: 1 });
    const header = screen.getByRole('banner');
    const aside = funFact();

    await act(() => router.navigate('/remote'));

    expect(await screen.findByRole('heading', { name: 'Fake remote section' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1 }));
    expect(screen.getByRole('banner')).toBe(header);
    expect(funFact()).toBe(aside);
    expect(aside).toHaveTextContent('This fake section is mounted through the contract.');
    expect(document.title).toBe(`Remote · ${SITE_TITLE}`);
  });

  it('moves focus to the heading the app renders asynchronously', async () => {
    const mountDone = deferred();
    const { load } = createFakeSectionApp({ mountDelay: mountDone.promise });
    const { router } = renderWithRemote('/', load);
    await screen.findByRole('heading', { level: 1 });

    await act(() => router.navigate('/remote'));
    await settle(() => mountDone.resolve());

    const heading = await screen.findByRole('heading', { name: 'Fake remote section' });
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it('owns every URL below its base path', async () => {
    const { load } = createFakeSectionApp();
    renderWithRemote('/remote/deeper/path', load);

    expect(await screen.findByRole('heading', { name: 'Fake remote section' })).toBeInTheDocument();
  });

  it('stays mounted while navigating between its own sub-paths', async () => {
    const { load, stats } = createFakeSectionApp();
    const { router } = renderWithRemote('/remote/a', load);
    await screen.findByRole('heading', { name: 'Fake remote section' });

    await act(() => router.navigate('/remote/b'));

    expect(stats.mounts).toBe(1);
    expect(stats.unmounts).toBe(0);
    expect(fakeViews()).toHaveLength(1);
  });

  it('navigates through the shell when the app calls ctx.navigate, unmounting it once', async () => {
    const { load, stats } = createFakeSectionApp();
    const { user } = renderWithRemote('/remote', load);

    await user.click(await screen.findByRole('button', { name: 'Go to About' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'About' })).toBeInTheDocument();
    expect(stats.unmounts).toBe(1);
    expect(fakeViews()).toHaveLength(0);
  });

  it('never mounts a stale app when the visitor leaves before load() resolves', async () => {
    const { app, stats } = createFakeSectionApp();
    const pending = deferred<unknown>();
    const { router } = renderWithRemote('/remote', () => pending.promise);
    expect(await screen.findByRole('status')).toHaveTextContent('Loading section…');

    await act(() => router.navigate('/about'));
    await settle(() => pending.resolve(app));

    expect(screen.getByRole('heading', { level: 1, name: 'About' })).toBeInTheDocument();
    expect(stats.mounts).toBe(0);
    expect(fakeViews()).toHaveLength(0);
  });

  it('mounts a fresh single instance when the visitor comes back', async () => {
    const { load, stats } = createFakeSectionApp();
    const { router } = renderWithRemote('/remote', load);
    await screen.findByRole('heading', { name: 'Fake remote section' });

    await act(() => router.navigate('/about'));
    await act(() => router.navigate('/remote'));
    await screen.findByRole('heading', { name: 'Fake remote section' });

    expect(stats.mounts).toBe(2);
    expect(stats.unmounts).toBe(1);
    expect(stats.peakActive).toBe(1);
    expect(fakeViews()).toHaveLength(1);
  });
});

describe('remote section errors reach the route error boundary', () => {
  let consoleError: MockInstance<typeof console.error>;
  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    consoleError.mockRestore();
  });

  async function expectErrorPageInsideShell() {
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Something went wrong' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(fakeViews()).toHaveLength(0);
  }

  it('when load() rejects after the first render', async () => {
    const pending = deferred<unknown>();
    renderWithRemote('/remote', () => pending.promise);
    expect(await screen.findByRole('status')).toHaveTextContent('Loading section…');

    await settle(() => pending.reject(new Error('entry not found')));

    await expectErrorPageInsideShell();
  });

  it('when mount() throws synchronously', async () => {
    const { load } = createFakeSectionApp({ failMount: 'sync' });
    renderWithRemote('/remote', load);

    await expectErrorPageInsideShell();
  });

  it('when mount() rejects after the first render', async () => {
    const { load } = createFakeSectionApp({ failMount: 'async' });
    renderWithRemote('/remote', load);
    expect(screen.getByRole('banner')).toBeInTheDocument();

    await expectErrorPageInsideShell();
  });

  it('when the loaded module does not implement the contract', async () => {
    renderWithRemote('/remote', () => Promise.resolve({ mount: () => undefined }));

    await expectErrorPageInsideShell();
  });
});

describe('mascot compositions', () => {
  const composition = () =>
    document.querySelector('[data-composition]')?.getAttribute('data-composition');
  const funFactMascots = () => document.querySelectorAll('[data-mascot="fun-fact"]');
  const headerMascot = () => document.querySelector<HTMLElement>('[data-mascot="header"]');

  it.each([
    ['/', 'hero'],
    ['/about', 'peek'],
    ['/projects', 'peek'],
    ['/architecture', 'peek'],
    ['/contact', 'peek'],
    ['/does-not-exist', 'peek'],
  ])('%s shows the Fun Fact mascot in the %s composition', async (path, expected) => {
    renderRoute(path);
    await screen.findByRole('heading', { level: 1 });

    expect(composition()).toBe(expected);
    expect(funFactMascots()).toHaveLength(1);
  });

  it('switches composition between pages while the Fun Fact card stays the same element', async () => {
    const { router } = renderRoute('/');
    await screen.findByRole('heading', { level: 1 });
    const aside = funFact();
    expect(composition()).toBe('hero');

    await act(() => router.navigate('/about'));
    await screen.findByRole('heading', { level: 1, name: 'About' });
    expect(composition()).toBe('peek');
    expect(funFact()).toBe(aside);

    await act(() => router.navigate('/'));
    await screen.findByRole('heading', { level: 1, name: "Hi, I'm Bruno." });
    expect(composition()).toBe('hero');
    expect(funFact()).toBe(aside);
  });

  it('shows both independent mascots on desktop; only the header one ever moves', async () => {
    const { router } = renderRoute('/');
    await screen.findByRole('heading', { level: 1 });
    expect(headerMascot()).not.toBeNull();

    await act(() => router.navigate('/about'));
    await screen.findByRole('heading', { level: 1, name: 'About' });

    expect(headerMascot()).not.toBeNull();
    expect(funFactMascots()).toHaveLength(1);
    const funFactMascot = funFactMascots()[0] as HTMLElement;
    expect(funFactMascot).toHaveAttribute('data-pose', 'peeking');
    // Stationary: no positioning transform on the Fun Fact mascot or its slot.
    expect(funFactMascot.style.transform).toBe('');
    expect(funFactMascot.parentElement?.style.transform).toBe('');
  });

  it('keeps the Fun Fact mascot on small screens, without the header mascot', async () => {
    setMedia({ desktop: false });
    renderRoute('/about');
    await screen.findByRole('heading', { level: 1 });

    expect(headerMascot()).toBeNull();
    expect(composition()).toBe('peek');
    expect(funFactMascots()).toHaveLength(1);
  });

  it('shows the illustrated backdrop on Home only', async () => {
    const backdrop = () => document.querySelector('[data-slot="backdrop"]');
    const { router } = renderRoute('/');
    await screen.findByRole('heading', { level: 1 });
    expect(backdrop()).not.toBeNull();

    await act(() => router.navigate('/about'));
    await screen.findByRole('heading', { level: 1, name: 'About' });
    expect(backdrop()).toBeNull();
  });

  it.each([
    ['/', 'stacked'],
    ['/about', 'aside'],
    ['/projects', 'intro'],
    ['/architecture', 'intro'],
    ['/contact', 'aside'],
    ['/does-not-exist', 'stacked'],
  ])('%s places the Fun Fact %s', async (path, expected) => {
    renderRoute(path);
    await screen.findByRole('heading', { level: 1 });

    expect(document.querySelector('[data-context]')).toHaveAttribute('data-context', expected);
  });
});
