import { Link } from 'react-router';
import Nav, { type NavItem } from '../../components/Nav/Nav.tsx';
import { liveSections } from '../../sections/registry.ts';
import styles from './SiteHeader.module.css';

const navItems: readonly NavItem[] = liveSections.map((section) => ({
  label: section.label,
  to: section.path,
}));

function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand}>
          <span className={styles.name}>Bruno</span>
          <span className={styles.role}>Full-Stack Software Engineer</span>
        </Link>
        <Nav items={navItems} />
      </div>
    </header>
  );
}

export default SiteHeader;
