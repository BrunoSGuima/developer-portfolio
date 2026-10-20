import type { ReactNode } from 'react';
import { Link } from 'react-router';
import LanguageSwitcher from '../../components/LanguageSwitcher/LanguageSwitcher.tsx';
import Nav, { type NavItem } from '../../components/Nav/Nav.tsx';
import { profile } from '../../content/profile.ts';
import { useLocale } from '../../i18n/context.ts';
import { localizePath } from '../../i18n/locales.ts';
import { pick } from '../../i18n/localized.ts';
import { liveSections } from '../../sections/registry.ts';
import styles from './SiteHeader.module.css';

interface SiteHeaderProps {
  /** Rendered in the lane at the top of the header (the desktop mascot). */
  lane?: ReactNode;
}

function SiteHeader({ lane }: SiteHeaderProps) {
  const locale = useLocale();
  const navItems: readonly NavItem[] = liveSections.map((section) => ({
    label: pick(section.label, locale),
    to: localizePath(section.path, locale),
    end: section.path === '/',
  }));

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        {lane}
        <Link to={localizePath('/', locale)} className={styles.brand} viewTransition>
          <span className={styles.name}>{profile.fullName}</span>{' '}
          <span className={styles.role}>{pick(profile.role, locale)}</span>
        </Link>
        {/*
          The language switcher: in the menu panel on small screens; in the header from 48rem
          (outside the main nav, so the nav mascot ignores it). See SiteHeader.module.css.
        */}
        <div className={styles.actions}>
          <Nav items={navItems} panelFooter={<LanguageSwitcher />} />
          <div className={styles.language}>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
