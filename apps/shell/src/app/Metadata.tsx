import {
  DEFAULT_LOCALE,
  type Locale,
  LOCALES,
  localeConfig,
  localizePath,
  stripLocale,
} from '../i18n/locales.ts';

interface MetadataProps {
  title: string;
  description: string;
  locale: Locale;
  pathname: string;
  /** False on the not-found page: no canonical or language alternates for a missing page. */
  indexable: boolean;
}

function siteOrigin(): string {
  return import.meta.env.VITE_SITE_ORIGIN ?? window.location.origin;
}

/**
 * Document metadata for the current page (React hoists these into <head>): the title, the
 * description, the canonical URL and one alternate per language, so search engines can pair
 * `/about` with `/pt-br/about`. Derived only from the route, so prerendering can reuse it.
 */
function Metadata({ title, description, locale, pathname, indexable }: MetadataProps) {
  // Language-neutral path without a trailing slash ("/pt-br/about/" → "/about").
  const neutral = stripLocale(pathname).replace(/(.)\/$/, '$1');
  const urlIn = (target: Locale) => `${siteOrigin()}${localizePath(neutral, target)}`;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      {indexable && (
        <>
          <link rel="canonical" href={urlIn(locale)} />
          {LOCALES.map((target) => (
            <link
              key={target}
              rel="alternate"
              hrefLang={localeConfig[target].htmlLang}
              href={urlIn(target)}
            />
          ))}
          <link rel="alternate" hrefLang="x-default" href={urlIn(DEFAULT_LOCALE)} />
        </>
      )}
    </>
  );
}

export default Metadata;
