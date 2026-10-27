import type { RouteObject } from 'react-router';
import { LOCALES, type Locale, localeConfig, localizePath } from '../i18n/locales.ts';
import RemoteSection from '../microfrontends/RemoteSection.tsx';
import type { Section } from '../sections/registry.ts';
import NotFoundPage from './pages/NotFoundPage.tsx';
import RouteErrorPage from './pages/RouteErrorPage.tsx';
import RootLayout from './RootLayout.tsx';
import type { RouteHandle } from './routeHandle.ts';

/**
 * Builds the route tree from the section registry, once per language (ADR-0004, ADR-0007):
 *
 *   RootLayout (the persistent shell)
 *   └── error route (failures render inside the shell)
 *       ├── "/"       English:    sections + "*" 404
 *       └── "/pt-br"  Portuguese: the same sections + "*" 404
 *
 * Both languages share the same pages and lazy chunks; only the URL differs. The shell reads
 * the language from the URL, so `/pt-br/anything-unknown` shows the Portuguese 404.
 */
export function buildRoutes(sections: readonly Section[]): RouteObject[] {
  const notFoundHandle: RouteHandle = { notFound: true };

  return [
    {
      element: <RootLayout />,
      children: [
        {
          errorElement: <RouteErrorPage />,
          children: LOCALES.map((locale) => ({
            path: localeConfig[locale].prefix || '/',
            children: [
              ...sections.map((section) => sectionRoute(section, locale)),
              { path: '*', element: <NotFoundPage />, handle: notFoundHandle },
            ],
          })),
        },
      ],
    },
  ];
}

function sectionRoute(section: Section, locale: Locale): RouteObject {
  const handle: RouteHandle = { section };
  const { mount } = section;
  // Child paths are relative to the language's prefix; the home section is the index route.
  const relative = section.path.replace(/^\//, '');

  if (mount.kind === 'remote') {
    // `/*`: the section app owns every URL below its base path.
    return {
      path: `${relative}/*`,
      handle,
      element: (
        <RemoteSection
          load={mount.load}
          basePath={localizePath(section.path, locale)}
          locale={locale}
        />
      ),
    };
  }

  const lazy = async () => {
    const page = await mount.load();
    return { Component: page.default };
  };
  // A section's data loader (e.g. Projects, projects/source.ts) runs alongside the lazy page;
  // its action (e.g. Contact, contact/action.ts) handles the page's form submissions.
  const data = {
    ...(section.loader ? { loader: section.loader } : {}),
    ...(section.action ? { action: section.action } : {}),
  };
  return relative === ''
    ? { index: true, handle, lazy, ...data }
    : { path: relative, handle, lazy, ...data };
}
