import type { ReactNode } from 'react';
import styles from './AppLayout.module.css';
import SiteFooter from './SiteFooter.tsx';
import SiteHeader from './SiteHeader.tsx';

interface AppLayoutProps {
  currentPath: string;
  children: ReactNode;
}

/** Persistent page frame: stays mounted while sections change. */
function AppLayout({ currentPath, children }: AppLayoutProps) {
  return (
    <div className={styles.layout}>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <SiteHeader currentPath={currentPath} />
      {/* Context row: the Fun Fact (Step 4) and the mascot's spot beside it (Step 7). */}
      <div className="container" />
      <main id="main" tabIndex={-1} className={`container ${styles.main}`}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export default AppLayout;
