import { createContext, useCallback, useContext } from 'react';
import { DEFAULT_LOCALE, type Locale, localizePath } from './locales.ts';
import { messages } from './messages/index.ts';

/**
 * The active language. RootLayout provides it from the URL (the only source of truth);
 * anything rendered outside it (e.g. a component in a unit test) gets the default language.
 */
export const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** The interface strings for the active language. */
export function useMessages() {
  return messages[useLocale()];
}

/** Builds internal links in the active language: "/about" → "/pt-br/about" in Portuguese. */
export function useLocalizedPath() {
  const locale = useLocale();
  return useCallback((path: string) => localizePath(path, locale), [locale]);
}
