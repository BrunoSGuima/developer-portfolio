import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { localizePath } from '../i18n/locales.ts';
import { messages } from '../i18n/messages/index.ts';
import { liveSections, type Section, shellFunFact } from '../sections/registry.ts';
import { createFakeSectionApp } from '../test/fakeSectionApp.ts';
import { same } from '../test/localized.ts';
import { renderRoute } from '../test/renderRoute.tsx';

const pt = messages['pt-BR'];
const funFact = (name = 'Fun fact') => screen.getByRole('complementary', { name });
const head = (selector: string) => document.head.querySelector(selector);

/** jsdom renders the small-screen layout: the switcher is in the menu panel. */
async function switchLanguage(user: ReturnType<typeof renderRoute>['user'], short: 'EN' | 'PT') {
  await user.click(screen.getByRole('button', { name: 'Menu' }));
  await user.click(screen.getByRole('link', { name: new RegExp(`^${short} —`) }));
}

afterEach(() => {
  document.documentElement.lang = 'en';
});

describe('Portuguese pages (/pt-br)', () => {
  it.each(liveSections.map((section) => [localizePath(section.path, 'pt-BR'), section] as const))(
    '%s renders the section in Portuguese, with its Fun Fact, title and language',
    async (path, section) => {
      renderRoute(path);

      const heading = await screen.findByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent(
        section.path === '/' ? pt.home.heading : section.title['pt-BR'],
      );
      expect(funFact('Curiosidade')).toHaveTextContent(section.funFact.text['pt-BR']);
      expect(document.documentElement.lang).toBe('pt-BR');
      expect(document.title).toContain(pt.site.title);
    },
  );

  it('also serves the Portuguese home with a trailing slash', async () => {
    renderRoute('/pt-br/');

    expect(
      await screen.findByRole('heading', { level: 1, name: pt.home.heading }),
    ).toBeInTheDocument();
  });

  it('shows the Portuguese 404 for unknown Portuguese URLs (English for the rest)', async () => {
    renderRoute('/pt-br/does-not-exist');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute(
      'href',
      '/pt-br',
    );
    expect(funFact('Curiosidade')).toHaveTextContent(shellFunFact.text['pt-BR']);
    expect(document.title).toBe(`Página não encontrada · ${pt.site.title}`);
  });

  it('always shows English at "/" and Portuguese at "/pt-br": the URL alone decides', async () => {
    const { router } = renderRoute('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: "Hi, I'm Bruno." }),
    ).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');

    await act(() => router.navigate('/pt-br'));
    expect(
      await screen.findByRole('heading', { level: 1, name: pt.home.heading }),
    ).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('pt-BR');
  });

  it('builds every internal link in Portuguese', async () => {
    const { user } = renderRoute('/pt-br');
    await screen.findByRole('heading', { level: 1 });
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    await user.click(within(nav).getByRole('button', { name: 'Menu' }));

    expect(within(nav).getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/pt-br');
    expect(within(nav).getByRole('link', { name: 'Início' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Projetos' })).toHaveAttribute(
      'href',
      '/pt-br/projects',
    );
    expect(screen.getByRole('link', { name: /Ver projetos/ })).toHaveAttribute(
      'href',
      '/pt-br/projects',
    );
    expect(screen.getByRole('link', { name: /Bruno Soares Guimarães/ })).toHaveAttribute(
      'href',
      '/pt-br',
    );
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toBeInTheDocument();
  });
});

describe('switching languages', () => {
  it('stays on the same page, keeps the shell mounted, and moves focus to the new heading', async () => {
    const { user, router } = renderRoute('/about');
    await screen.findByRole('heading', { level: 1, name: 'About' });
    const header = screen.getByRole('banner');

    await switchLanguage(user, 'PT');

    const heading = await screen.findByRole('heading', { level: 1, name: 'Sobre' });
    expect(router.state.location.pathname).toBe('/pt-br/about');
    expect(screen.getByRole('banner')).toBe(header);
    // Focus moves in an effect after the new page renders.
    await waitFor(() => expect(heading).toHaveFocus());
    expect(document.documentElement.lang).toBe('pt-BR');
    // The panel closed with the navigation; both switchers (panel and header) mark Portuguese.
    for (const link of screen.getAllByRole('link', { name: /^PT —/, hidden: true })) {
      expect(link).toHaveAttribute('aria-current', 'true');
    }
  });

  it('works with the browser history: back and forward restore the language', async () => {
    const { user, router } = renderRoute('/projects');
    await screen.findByRole('heading', { level: 1, name: 'Projects' });
    await switchLanguage(user, 'PT');
    await screen.findByRole('heading', { level: 1, name: 'Projetos' });

    await act(() => router.navigate(-1));
    expect(await screen.findByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe(`Projects · ${messages.en.site.title}`);

    await act(() => router.navigate(1));
    expect(await screen.findByRole('heading', { level: 1, name: 'Projetos' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('pt-BR');
  });

  it('keeps an unknown address when switching, showing the other language’s 404', async () => {
    const { user, router } = renderRoute('/nope');
    await screen.findByRole('heading', { level: 1, name: 'Page not found' });

    await switchLanguage(user, 'PT');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/pt-br/nope');
  });
});

describe('document metadata', () => {
  it('describes the page and links its language alternates', async () => {
    renderRoute('/pt-br/about');
    await screen.findByRole('heading', { level: 1, name: 'Sobre' });
    const origin = window.location.origin;

    expect(head('meta[name="description"]')).toHaveAttribute(
      'content',
      liveSections.find((section) => section.id === 'about')!.description['pt-BR'],
    );
    expect(head('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/pt-br/about`);
    expect(head('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', `${origin}/about`);
    expect(head('link[rel="alternate"][hreflang="pt-BR"]')).toHaveAttribute(
      'href',
      `${origin}/pt-br/about`,
    );
    expect(head('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      'href',
      `${origin}/about`,
    );
  });

  it('gives the home pages clean canonical URLs', async () => {
    renderRoute('/pt-br/');
    await screen.findByRole('heading', { level: 1 });

    expect(head('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${window.location.origin}/pt-br`,
    );
    expect(document.title).toBe(pt.site.title);
  });

  it('marks no canonical or alternates on a missing page', async () => {
    renderRoute('/pt-br/nope');
    await screen.findByRole('heading', { level: 1 });

    expect(head('link[rel="canonical"]')).toBeNull();
    expect(head('link[rel="alternate"]')).toBeNull();
    expect(head('meta[name="description"]')).toHaveAttribute('content', pt.notFound.description);
  });
});

describe('remote sections and the language', () => {
  const remote = (load: () => Promise<unknown>): Section => ({
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
  });

  it('passes the locale and a localized base path, and remounts once on a language switch', async () => {
    const { load, stats } = createFakeSectionApp();
    const { router } = renderRoute('/remote', { sections: [...liveSections, remote(load)] });
    await screen.findByRole('heading', { name: 'Fake remote section' });
    expect(stats.lastContext).toMatchObject({ locale: 'en', basePath: '/remote' });

    await act(() => router.navigate('/pt-br/remote'));
    await screen.findByRole('heading', { name: 'Fake remote section' });

    expect(stats.unmounts).toBe(1);
    expect(stats.mounts).toBe(2);
    expect(stats.lastContext).toMatchObject({ locale: 'pt-BR', basePath: '/pt-br/remote' });
  });

  it("keeps the visitor's language when the app navigates", async () => {
    const { load } = createFakeSectionApp();
    const { user, router } = renderRoute('/pt-br/remote', {
      sections: [...liveSections, remote(load)],
    });

    await user.click(await screen.findByRole('button', { name: 'Go to About' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Sobre' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/pt-br/about');
  });
});
