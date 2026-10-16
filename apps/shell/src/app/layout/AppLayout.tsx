import type { ReactNode } from 'react';
import styles from './AppLayout.module.css';
import SiteFooter from './SiteFooter.tsx';
import SiteHeader from './SiteHeader.tsx';

interface AppLayoutProps {
  /** Context row above the page content: the Fun Fact (and, in Step 7, the mascot's spot). */
  context?: ReactNode;
  children: ReactNode;
}

/** Persistent page frame: stays mounted while sections change. */
function AppLayout({ context, children }: AppLayoutProps) {
  return (
    <div className={styles.layout}>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <SiteHeader />
      <div className="container">{context}</div>
      <main id="main" tabIndex={-1} className={`container ${styles.main}`}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export default AppLayout;
