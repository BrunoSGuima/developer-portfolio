import type { Localized } from '../i18n/localized.ts';

/** Test fixtures: the same text in every language. */
export function same(value: string): Localized<string> {
  return { en: value, 'pt-BR': value };
}
