import { act, configure, getConfig, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { liveSections, type Section } from '../sections/registry.ts';
import { createFakeSectionApp } from '../test/fakeSectionApp.ts';
import { same } from '../test/localized.ts';
import { buildRoutes } from './routes.tsx';

/**
 * Page transitions (ADR-0008). React Router only starts view transitions with a real browser
 * router, so these tests use `createBrowserRouter` on jsdom's history (not `renderRoute`), with
 * a synchronous stand-in for `document.startViewTransition` that records each call.
 */
let transitions = 0;

function installViewTransitions() {
  transitions = 0;
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    value: (update: () => void | Promise<void>) => {
      transitions += 1;
      const done = Promise.resolve(update()).then(() => undefined);
      return { finished: done, ready: done, updateCallbackDone: done, skipTransition() {} };
    },
  });
}

function renderApp(path: string, sections: readonly Section[] = liveSections) {
  window.history.replaceState(null, '', path);
  const router = createBrowserRouter(buildRoutes(sections));
  const user = userEvent.setup();
  render(<RouterProvider router={router} />);
  return { router, user };
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Menu' }));
}

// Load the (lazy) page modules once, so the tests time navigation, not first-time compilation.
// React Router renders a transitioned navigation as a low-priority React transition, which can
// take longer than the default 1s under a loaded test run: allow more time in this file.
const { asyncUtilTimeout } = getConfig();
beforeAll(async () => {
  configure({ asyncUtilTimeout: 5000 });
  for (const { mount } of liveSections) if (mount.kind === 'react') await mount.load();
});
afterAll(() => configure({ asyncUtilTimeout }));
beforeEach(installViewTransitions);
afterEach(() => {
  Reflect.deleteProperty(document, 'startViewTransition');
  window.sessionStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('page transitions', () => {
  it('crossfades a nav link navigation, keeping the shell mounted and moving focus', async () => {
    const { user } = renderApp('/');
    await screen.findByRole('heading', { level: 1, name: "Hi, I'm Bruno." });
    const header = screen.getByRole('banner');
    const funFact = screen.getByRole('complementary', { name: 'Fun fact' });

    await openMenu(user);
    await user.click(screen.getByRole('link', { name: 'About' }));

    const heading = await screen.findByRole('heading', { level: 1, name: 'About' });
    expect(transitions).toBe(1);
    expect(screen.getByRole('banner')).toBe(header);
    expect(screen.getByRole('complementary', { name: 'Fun fact' })).toBe(funFact);
    // Focus moves in an effect after the new page renders.
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it.each([
    ['the Home buttons', '/', /View Projects/, 'Projects'],
    ['the brand link', '/about', /Bruno Soares Guimarães/, "Hi, I'm Bruno."],
    ['the inline Architecture link', '/', /Explore the architecture/, 'Architecture'],
    ['the inline About link on Projects', '/projects', /^About$/, 'About'],
    ['the 404 home link', '/nope', /Back to home/, "Hi, I'm Bruno."],
  ])('crossfades %s', async (_name, start, link, destination) => {
    const { user } = renderApp(start);
    await screen.findByRole('heading', { level: 1 });

    const main = screen.getByRole('main');
    const target =
      within(main).queryByRole('link', { name: link }) ?? screen.getByRole('link', { name: link });
    await user.click(target);

    expect(await screen.findByRole('heading', { level: 1, name: destination })).toBeInTheDocument();
    expect(transitions).toBe(1);
  });

  it('crossfades a language switch, staying on the same page', async () => {
    const { user, router } = renderApp('/about');
    await screen.findByRole('heading', { level: 1, name: 'About' });

    await openMenu(user);
    await user.click(screen.getByRole('link', { name: /^PT —/ }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Sobre' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/pt-br/about');
    expect(transitions).toBe(1);
  });

  it('crossfades back and forward after a crossfaded navigation', async () => {
    const { user, router } = renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    await openMenu(user);
    await user.click(screen.getByRole('link', { name: 'Contact' }));
    await screen.findByRole('heading', { level: 1, name: 'Contact' });

    await act(() => router.navigate(-1));
    await screen.findByRole('heading', { level: 1, name: "Hi, I'm Bruno." });
    await act(() => router.navigate(1));
    await screen.findByRole('heading', { level: 1, name: 'Contact' });

    expect(transitions).toBe(3);
  });

  it("crossfades a remote app's navigation through ctx.navigate", async () => {
    const { load } = createFakeSectionApp();
    const remote: Section = {
      id: 'remote',
      path: '/remote',
      label: same('Remote'),
      title: same('Remote'),
      description: same('A fake remote section.'),
      framework: 'vue',
      backend: 'none',
      status: 'live',
      mount: { kind: 'remote', entry: '/apps/remote/entry.js', load },
      funFact: { text: same('Mounted through the contract.'), tech: ['vue'] },
    };
    const { user } = renderApp('/remote', [...liveSections, remote]);

    await user.click(await screen.findByRole('button', { name: 'Go to About' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'About' })).toBeInTheDocument();
    expect(transitions).toBe(1);
  });

  it('falls back to an instant navigation where the browser has no View Transitions', async () => {
    Reflect.deleteProperty(document, 'startViewTransition');
    const { user } = renderApp('/');
    await screen.findByRole('heading', { level: 1 });

    await openMenu(user);
    await user.click(screen.getByRole('link', { name: 'Projects' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
    expect(transitions).toBe(0);
  });
});
