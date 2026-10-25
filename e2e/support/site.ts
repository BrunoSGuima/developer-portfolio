/**
 * What the site should show, taken from the app's own sources (languages, dictionaries and the
 * section registry), so the specs never duplicate copy and cover every language automatically.
 */
import {
  LOCALES,
  type Locale,
  localeConfig,
  localizePath,
} from '../../apps/shell/src/i18n/locales.ts';
import { pick } from '../../apps/shell/src/i18n/localized.ts';
import { messages } from '../../apps/shell/src/i18n/messages/index.ts';
import { liveSections, shellFunFact } from '../../apps/shell/src/sections/registry.ts';

export { LOCALES, localeConfig, localizePath, messages, type Locale };

export interface PageCase {
  id: string;
  locale: Locale;
  /** The URL path in this language. */
  path: string;
  /** The page's <h1>. */
  heading: string;
  /** The nav label. */
  label: string;
  /** The full document title. */
  title: string;
  description: string;
  funFact: string;
}

export const pages: readonly PageCase[] = LOCALES.flatMap((locale) =>
  liveSections.map((section) => {
    const strings = messages[locale];
    const isHome = section.path === '/';
    const title = pick(section.title, locale);
    return {
      id: section.id,
      locale,
      path: localizePath(section.path, locale),
      heading: isHome ? strings.home.heading : title,
      label: pick(section.label, locale),
      title: isHome ? strings.site.title : `${title} · ${strings.site.title}`,
      description: pick(section.description, locale),
      funFact: pick(section.funFact.text, locale),
    };
  }),
);

export function pagesIn(locale: Locale): readonly PageCase[] {
  return pages.filter((page) => page.locale === locale);
}

export function pageOf(id: string, locale: Locale): PageCase {
  const page = pages.find((candidate) => candidate.id === id && candidate.locale === locale);
  if (!page) throw new Error(`No page "${id}" in ${locale}`);
  return page;
}

/** An address that matches no section, in each language. */
export function notFoundCase(locale: Locale) {
  const strings = messages[locale];
  return {
    path: localizePath('/does-not-exist', locale),
    heading: strings.notFound.title,
    title: `${strings.notFound.title} · ${strings.site.title}`,
    description: strings.notFound.description,
    funFact: pick(shellFunFact.text, locale),
  };
}

/** The `<html lang>` value and the switcher's link name for a language. */
export function languageOf(locale: Locale) {
  const { htmlLang, short, name } = localeConfig[locale];
  return { htmlLang, linkName: `${short} — ${name}` };
}

/** Widths the layout must hold at (ADR-0006), from small phones to ultrawide. */
export const LAYOUT_WIDTHS = [320, 375, 768, 1024, 1280, 1440, 1920, 2560] as const;
