import { LOCALES, type Locale } from './locales.ts';

/**
 * A value written once per supported language. Content keeps its facts (dates, links, ids,
 * statuses) single-sourced and only its prose localized, so the languages can't drift apart.
 */
export type Localized<T> = Readonly<Record<Locale, T>>;

/** Text that is either the same in every language (names, technologies) or translated. */
export type Text = string | Localized<string>;

export function pick<T>(value: Localized<T>, locale: Locale): T {
  return value[locale];
}

export function text(value: Text, locale: Locale): string {
  return typeof value === 'string' ? value : value[locale];
}

/** True for an object holding exactly one entry per supported language (used by tests). */
export function isLocalized(value: unknown): value is Localized<unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === LOCALES.length && LOCALES.every((locale) => keys.includes(locale));
}
