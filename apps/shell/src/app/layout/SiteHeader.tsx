import Nav from '../../components/Nav/Nav.tsx';
import { navItems } from '../navItems.ts';
import styles from './SiteHeader.module.css';

interface SiteHeaderProps {
  currentPath: string;
}

function SiteHeader({ currentPath }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <a href="/" className={styles.brand}>
          <span className={styles.name}>Bruno</span>
          <span className={styles.role}>Software Engineer</span>
        </a>
        <Nav items={navItems} currentPath={currentPath} />
      </div>
    </header>
  );
}

export default SiteHeader;
