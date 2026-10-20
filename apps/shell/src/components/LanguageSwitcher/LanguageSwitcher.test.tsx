import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { LocaleContext } from '../../i18n/context.ts';
import { localeFromPath } from '../../i18n/locales.ts';
import LanguageSwitcher from './LanguageSwitcher.tsx';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocaleContext value={localeFromPath(path)}>
        <LanguageSwitcher />
      </LocaleContext>
    </MemoryRouter>,
  );
}

describe('LanguageSwitcher', () => {
  it('is a labelled navigation with one link per language, named after the visible label', () => {
    renderAt('/about');

    const nav = screen.getByRole('navigation', { name: 'Language' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['EN', 'PT']);
    expect(links[0]).toHaveAccessibleName('EN — English');
    expect(links[1]).toHaveAccessibleName('PT — Português (Brasil)');
  });

  it('marks each link with its language and the current one with aria-current', () => {
    renderAt('/about');

    const en = screen.getByRole('link', { name: /^EN/ });
    const pt = screen.getByRole('link', { name: /^PT/ });
    expect(en).toHaveAttribute('lang', 'en');
    expect(en).toHaveAttribute('hreflang', 'en');
    expect(pt).toHaveAttribute('lang', 'pt-BR');
    expect(pt).toHaveAttribute('hreflang', 'pt-BR');
    expect(en).toHaveAttribute('aria-current', 'true');
    expect(pt).not.toHaveAttribute('aria-current');
  });

  it.each([
    ['/about', '/about', '/pt-br/about'],
    ['/pt-br/projects', '/projects', '/pt-br/projects'],
    ['/', '/', '/pt-br'],
    ['/pt-br', '/', '/pt-br'],
    ['/nope?x=1#top', '/nope?x=1#top', '/pt-br/nope?x=1#top'],
  ])('on %s links to the same page in each language', (path, enHref, ptHref) => {
    renderAt(path);

    expect(screen.getByRole('link', { name: /^EN/ })).toHaveAttribute('href', enHref);
    expect(screen.getByRole('link', { name: /^PT/ })).toHaveAttribute('href', ptHref);
  });

  it('labels itself in Portuguese on Portuguese pages', () => {
    renderAt('/pt-br/about');

    expect(screen.getByRole('navigation', { name: 'Idioma' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^PT/ })).toHaveAttribute('aria-current', 'true');
  });
});
