import { useLayoutEffect } from 'react';
import { type Locale, localeConfig } from '../i18n/locales.ts';

/**
 * Keeps `<html lang>` in step with the language of the current URL (including back/forward),
 * so screen readers pronounce the page in the right language. React can't render <html>
 * attributes in a client-rendered app, so this sets it directly, before the browser paints.
 */
export function useDocumentLang(locale: Locale) {
  useLayoutEffect(() => {
    document.documentElement.lang = localeConfig[locale].htmlLang;
  }, [locale]);
}
