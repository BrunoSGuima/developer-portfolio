/**
 * Supported languages (ADR-0007). English is the default and unprefixed; every other locale
 * lives under its own path prefix. The URL is the only source of truth for the language.
 */
export const LOCALES = ['en', 'pt-BR'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export interface LocaleConfig {
  /** URL prefix: '' for the default locale, otherwise e.g. '/pt-br'. */
  prefix: string;
  /** BCP 47 tag for `<html lang>`, `lang`/`hreflang` attributes and remote sections. */
  htmlLang: string;
  /** Short label shown in the language switcher. */
  short: string;
  /** The language's own name, in that language. */
  name: string;
}

export const localeConfig: Readonly<Record<Locale, LocaleConfig>> = {
  en: { prefix: '', htmlLang: 'en', short: 'EN', name: 'English' },
  'pt-BR': { prefix: '/pt-br', htmlLang: 'pt-BR', short: 'PT', name: 'Português (Brasil)' },
};

/** The prefixed locale a path belongs to, if any (case-insensitive, like the router). */
function prefixedLocale(pathname: string): Locale | undefined {
  const path = pathname.toLowerCase();
  return LOCALES.find((locale) => {
    const { prefix } = localeConfig[locale];
    return prefix !== '' && (path === prefix || path.startsWith(`${prefix}/`));
  });
}

/** The language of a URL path: "/pt-br/about" → 'pt-BR', "/about" → 'en'. */
export function localeFromPath(pathname: string): Locale {
  return prefixedLocale(pathname) ?? DEFAULT_LOCALE;
}

/** The path without its locale prefix: "/pt-br/about" → "/about", "/pt-br" → "/". */
export function stripLocale(pathname: string): string {
  const locale = prefixedLocale(pathname);
  if (!locale) return pathname;
  const rest = pathname.slice(localeConfig[locale].prefix.length);
  return rest === '' ? '/' : rest;
}

/** A locale-neutral path in the given language: ("/about", 'pt-BR') → "/pt-br/about". */
export function localizePath(path: string, locale: Locale): string {
  const { prefix } = localeConfig[locale];
  if (prefix === '') return path;
  return path === '/' ? prefix : `${prefix}${path}`;
}

interface PathParts {
  pathname: string;
  search?: string;
  hash?: string;
}

/** The same page in another language, keeping the query string and hash. */
export function switchLocalePath({ pathname, search = '', hash = '' }: PathParts, target: Locale) {
  return `${localizePath(stripLocale(pathname), target)}${search}${hash}`;
}
