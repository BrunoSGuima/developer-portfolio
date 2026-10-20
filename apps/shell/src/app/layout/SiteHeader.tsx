import type { ReactNode } from 'react';
import { Link } from 'react-router';
import Nav, { type NavItem } from '../../components/Nav/Nav.tsx';
import { profile } from '../../content/profile.ts';
import { liveSections } from '../../sections/registry.ts';
import styles from './SiteHeader.module.css';

const navItems: readonly NavItem[] = liveSections.map((section) => ({
  label: section.label,
  to: section.path,
}));

interface SiteHeaderProps {
  /** Rendered in the lane at the top of the header (the desktop mascot). */
  lane?: ReactNode;
}

function SiteHeader({ lane }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        {lane}
        <Link to="/" className={styles.brand}>
          <span className={styles.name}>{profile.fullName}</span>{' '}
          <span className={styles.role}>{profile.role}</span>
        </Link>
        <Nav items={navItems} />
      </div>
    </header>
  );
}

export default SiteHeader;
