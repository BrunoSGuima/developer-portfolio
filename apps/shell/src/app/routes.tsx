import type { RouteObject } from 'react-router';
import RemoteSection from '../microfrontends/RemoteSection.tsx';
import type { Section } from '../sections/registry.ts';
import NotFoundPage from './pages/NotFoundPage.tsx';
import RouteErrorPage from './pages/RouteErrorPage.tsx';
import RootLayout from './RootLayout.tsx';
import type { RouteHandle } from './routeHandle.ts';

/**
 * Builds the route tree from the section registry.
 *
 * RootLayout (the persistent shell) wraps a pathless route whose error element catches failures
 * in any section (e.g. a chunk that fails to load), so errors render inside the shell.
 */
export function buildRoutes(sections: readonly Section[]): RouteObject[] {
  const notFoundHandle: RouteHandle = { title: 'Page not found' };

  return [
    {
      element: <RootLayout />,
      children: [
        {
          errorElement: <RouteErrorPage />,
          children: [
            ...sections.map(sectionRoute),
            { path: '*', element: <NotFoundPage />, handle: notFoundHandle },
          ],
        },
      ],
    },
  ];
}

function sectionRoute(section: Section): RouteObject {
  const handle: RouteHandle =
    section.path === '/' ? { section } : { section, title: section.title };

  const { mount } = section;

  if (mount.kind === 'remote') {
    // `/*`: the section app owns every URL below its base path.
    return {
      path: `${section.path}/*`,
      handle,
      element: <RemoteSection load={mount.load} basePath={section.path} />,
    };
  }

  return {
    path: section.path,
    handle,
    lazy: async () => {
      const page = await mount.load();
      return { Component: page.default };
    },
  };
}
