import { describe, expect, it } from 'vitest';
import { localeFromPath, localizePath, stripLocale, switchLocalePath } from './locales.ts';

describe('language from the URL', () => {
  it.each([
    ['/', 'en'],
    ['/about', 'en'],
    ['/does-not-exist', 'en'],
    ['/pt-br', 'pt-BR'],
    ['/pt-br/', 'pt-BR'],
    ['/pt-br/about', 'pt-BR'],
    ['/PT-BR/about', 'pt-BR'],
    ['/pt-br/does-not-exist', 'pt-BR'],
    // Only a whole path segment counts as a prefix.
    ['/pt-brazil', 'en'],
  ])('%s is %s', (path, locale) => {
    expect(localeFromPath(path)).toBe(locale);
  });
});

describe('path helpers', () => {
  it.each([
    ['/pt-br/about', '/about'],
    ['/pt-br', '/'],
    ['/pt-br/', '/'],
    ['/about', '/about'],
    ['/', '/'],
  ])('strips the language from %s → %s', (path, neutral) => {
    expect(stripLocale(path)).toBe(neutral);
  });

  it('localizes language-neutral paths (English stays unprefixed)', () => {
    expect(localizePath('/', 'en')).toBe('/');
    expect(localizePath('/about', 'en')).toBe('/about');
    expect(localizePath('/', 'pt-BR')).toBe('/pt-br');
    expect(localizePath('/about', 'pt-BR')).toBe('/pt-br/about');
  });

  it('switches to the same page in the other language, keeping the query and hash', () => {
    expect(switchLocalePath({ pathname: '/about' }, 'pt-BR')).toBe('/pt-br/about');
    expect(switchLocalePath({ pathname: '/pt-br/about' }, 'en')).toBe('/about');
    expect(switchLocalePath({ pathname: '/pt-br' }, 'en')).toBe('/');
    expect(switchLocalePath({ pathname: '/', search: '?a=1', hash: '#x' }, 'pt-BR')).toBe(
      '/pt-br?a=1#x',
    );
    // An unknown page stays unknown: you get the other language's 404.
    expect(switchLocalePath({ pathname: '/nope' }, 'pt-BR')).toBe('/pt-br/nope');
    // Switching to the current language is a no-op.
    expect(switchLocalePath({ pathname: '/pt-br/about' }, 'pt-BR')).toBe('/pt-br/about');
  });
});
