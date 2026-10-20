import { type ReactNode, useRef } from 'react';
import { useMessages } from '../../i18n/context.ts';
import styles from './AppLayout.module.css';
import SiteFooter from './SiteFooter.tsx';
import SiteHeader from './SiteHeader.tsx';
import { useHeroExtent } from './useHeroExtent.ts';

interface AppLayoutProps {
  /** Header lane content: the desktop mascot. */
  headerLane?: ReactNode;
  /** Context row above the page content: the Fun Fact and its mascot. */
  context?: ReactNode;
  /** Full-bleed artwork behind the context row and the page's hero (Home). */
  backdrop?: ReactNode;
  contextPlacement?: ContextPlacement;
  children: ReactNode;
}

/**
 * Where the Fun Fact sits relative to the page content, set per section. Below 64rem it is
 * always 'stacked' (above the content, the default). From 64rem:
 * - 'aside': a right-hand column beside the whole page;
 * - 'intro': beside the page's intro only, with the body full width below (needs `PageIntro`).
 */
export type ContextPlacement = 'stacked' | 'aside' | 'intro';

/** Persistent page frame: stays mounted while sections change. */
function AppLayout({
  headerLane,
  context,
  backdrop,
  contextPlacement = 'stacked',
  children,
}: AppLayoutProps) {
  const messages = useMessages();
  const regionRef = useRef<HTMLDivElement>(null);
  useHeroExtent(regionRef, Boolean(backdrop));

  return (
    <div className={styles.layout}>
      <a href="#main" className={styles.skipLink}>
        {messages.layout.skipLink}
      </a>
      <SiteHeader lane={headerLane} />
      {/* The region spans the full width so a backdrop can sit behind the Fun Fact and the hero. */}
      <div ref={regionRef} className={styles.region} data-slot="hero-region">
        {backdrop}
        <div className={`container ${styles.columns}`} data-context={contextPlacement}>
          <div className={styles.contextRow}>{context}</div>
          <main id="main" tabIndex={-1} className={styles.main}>
            {children}
          </main>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

export default AppLayout;
