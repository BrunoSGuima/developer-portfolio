import { lazy, type ReactElement, Suspense } from 'react';
import { Outlet, ScrollRestoration, useLocation, useMatches } from 'react-router';
import FunFact from '../components/FunFact/FunFact.tsx';
import { LocaleContext } from '../i18n/context.ts';
import { localeFromPath } from '../i18n/locales.ts';
import { pick } from '../i18n/localized.ts';
import { messages } from '../i18n/messages/index.ts';
import FunFactStage from '../mascot/FunFactStage.tsx';
import HeaderMascot from '../mascot/HeaderMascot.tsx';
import HomeBackdrop from '../mascot/HomeBackdrop.tsx';
import { DESKTOP_QUERY, useMediaQuery } from '../mascot/useMediaQuery.ts';
import { appMode } from '../config/mode.ts';
import PageFunFact from '../mascot/three/PageFunFact.tsx';
import { sectionInMode, sections, shellFunFact } from '../sections/registry.ts';
import AppLayout from './layout/AppLayout.tsx';
import Metadata from './Metadata.tsx';
import { readHandle } from './routeHandle.ts';
import { useCurrentSection } from './useCurrentSection.ts';
import { useDocumentLang } from './useDocumentLang.ts';
import { useRouteFocus } from './useRouteFocus.ts';

const homeSection = sections.find((section) => section.path === '/');

// The 3D mascot, in the published build only (ADR-0018). The comparison must stay inline, a literal that Vite replaces at build
// time, or a normal build keeps the chunk, `three` and the model (checked by the flagged E2E run's
// build test). A failed chunk must not take the page down: the 2D mascot takes over.
const Mascot3DHost =
  import.meta.env.VITE_MASCOT_3D === '1'
    ? lazy(() =>
        import('../mascot/three/Mascot3DHost.tsx').catch(() => {
          document.documentElement.dataset['mascot2d'] = '';
          return { default: () => null as ReactElement | null };
        }),
      )
    : null;

/**
 * Layout route: the persistent shell around whichever section is active. The language comes
 * from the URL (ADR-0007) and is provided to everything below.
 */
function RootLayout() {
  const { pathname } = useLocation();
  const locale = localeFromPath(pathname);
  const strings = messages[locale];
  const matches = useMatches();
  const notFound = matches.some((match) => readHandle(match).notFound);
  const section = useCurrentSection();
  const sectionId = section?.id;
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const isHome = sectionId === 'home';
  useRouteFocus();
  useDocumentLang(locale);

  // The home page uses the bare site title; other pages prefix theirs.
  const pageTitle =
    section && !isHome
      ? pick(section.title, locale)
      : notFound
        ? strings.notFound.title
        : undefined;
  // Pages without a section of their own (the error page) describe the site, like Home.
  const described = section ?? homeSection;
  const description = notFound
    ? strings.notFound.description
    : described
      ? pick(described.description, locale)
      : '';

  return (
    <LocaleContext value={locale}>
      <Metadata
        title={pageTitle ? `${pageTitle} · ${strings.site.title}` : strings.site.title}
        description={description}
        locale={locale}
        pathname={pathname}
        indexable={!notFound}
      />
      <AppLayout
        headerLane={isDesktop ? <HeaderMascot sectionId={sectionId} locale={locale} /> : undefined}
        backdrop={isHome ? <HomeBackdrop /> : undefined}
        contextPlacement={isHome ? 'stacked' : (section?.contextPlacement ?? 'stacked')}
        context={
          // Home: the mascot presents the card in the illustrated hero. Elsewhere: it peeks over it.
          <FunFactStage composition={isHome ? 'hero' : 'peek'} sectionId={sectionId}>
            {import.meta.env.VITE_MASCOT_3D === '1' ? (
              <PageFunFact
                fact={section ? sectionInMode(section, appMode).funFact : shellFunFact}
                sectionId={sectionId}
              />
            ) : (
              <FunFact fact={section ? sectionInMode(section, appMode).funFact : shellFunFact} />
            )}
          </FunFactStage>
        }
      >
        <Outlet />
      </AppLayout>
      {Mascot3DHost && (
        <Suspense fallback={null}>
          <Mascot3DHost sectionId={sectionId} locale={locale} />
        </Suspense>
      )}
      <ScrollRestoration />
    </LocaleContext>
  );
}

export default RootLayout;
