import { describe, expect, it } from 'vitest';
import { allContent } from '../content/index.ts';
import { isPlaceholder } from '../content/placeholder.ts';
import { sections, shellFunFact } from '../sections/registry.ts';
import { isLocalized } from './localized.ts';
import { DEFAULT_LOCALE, LOCALES } from './locales.ts';
import { messages } from './messages/index.ts';

/**
 * Text that is legitimately identical in English and Portuguese (names, technologies, words
 * Portuguese borrows). Anything else that is identical is probably an untranslated copy.
 */
const SAME_IN_BOTH = new Set([
  'Menu',
  'Links',
  'Frameworks',
  'LinkedIn',
  'GitHub',
  'TypeScript',
  'Python FastAPI',
]);

/** Every string leaf of a dictionary, with its dotted key. */
function leaves(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leaves(child, path ? `${path}.${key}` : key),
  );
}

/** Every `Localized` value inside some content, with where it was found. */
function localizedValues(value: unknown, path = ''): [string, Record<string, unknown>][] {
  if (isLocalized(value)) return [[path, value]];
  if (typeof value !== 'object' || value === null || isPlaceholder(value)) return [];
  return Object.entries(value).flatMap(([key, child]) =>
    localizedValues(child, path ? `${path}.${key}` : key),
  );
}

describe('interface strings (messages)', () => {
  const reference = new Map(leaves(messages[DEFAULT_LOCALE]));

  it.each(LOCALES)('%s has exactly the same keys as English, none empty', (locale) => {
    const strings = new Map(leaves(messages[locale]));

    expect([...strings.keys()].sort()).toEqual([...reference.keys()].sort());
    for (const [key, value] of strings) expect(value.trim(), key).not.toBe('');
  });

  it('has no untranslated copies of the English strings', () => {
    for (const locale of LOCALES.filter((other) => other !== DEFAULT_LOCALE)) {
      for (const [key, value] of leaves(messages[locale])) {
        if (SAME_IN_BOTH.has(value)) continue;
        expect(value, `${locale} ${key}`).not.toBe(reference.get(key));
      }
    }
  });
});

describe('content and registry text', () => {
  const content = {
    ...allContent,
    sections: sections.map(({ id, label, title, description, funFact }) => ({
      id,
      label,
      title,
      description,
      funFact,
    })),
    shellFunFact,
  };
  const values = localizedValues(content);

  it('finds the localized text (sanity check)', () => {
    expect(values.length).toBeGreaterThan(100);
  });

  it('gives every localized text a non-empty value in every language', () => {
    for (const [path, value] of values) {
      for (const locale of LOCALES) {
        const text = value[locale];
        if (isPlaceholder(text)) continue;
        expect(typeof text === 'string' && text.trim() !== '', `${path} (${locale})`).toBe(true);
      }
    }
  });

  it('has no untranslated copies of the English text', () => {
    for (const [path, value] of values) {
      for (const locale of LOCALES.filter((other) => other !== DEFAULT_LOCALE)) {
        const text = value[locale];
        if (typeof text !== 'string' || SAME_IN_BOTH.has(text)) continue;
        expect(text, `${path} (${locale})`).not.toBe(value[DEFAULT_LOCALE]);
      }
    }
  });
});
