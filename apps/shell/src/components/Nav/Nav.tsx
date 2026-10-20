import { type ReactNode, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { useMessages } from '../../i18n/context.ts';
import styles from './Nav.module.css';

export interface NavItem {
  label: string;
  to: string;
  /** Matches only this exact path (the home link). */
  end?: boolean;
}

interface NavProps {
  items: readonly NavItem[];
  /** Shown below the links in the small-screen panel only (the language switcher). */
  panelFooter?: ReactNode;
}

const PANEL_ID = 'primary-nav-panel';

/**
 * Main navigation (a disclosure on small screens).
 *
 * The <nav> landmark and its Menu button are always present; only the list collapses. On small
 * screens the open list is a panel below the header. It is not modal, so there is no focus trap:
 * Escape, clicking outside, or choosing a link closes it. On wide screens the button is hidden
 * by CSS and the list is always shown inline.
 *
 * Links are router NavLinks: navigation happens client-side and the active link gets
 * aria-current="page" automatically (the home link only matches exactly, via `end`).
 */
function Nav({ items, panelFooter }: NavProps) {
  const messages = useMessages();
  const { pathname } = useLocation();
  // The panel is open only on the page where it was opened, so any navigation (a link, a
  // language switch, back/forward) closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const isOpen = openOn === pathname;
  const close = () => setOpenOn(null);
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      close();
      toggleRef.current?.focus();
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && navRef.current?.contains(event.target)) return;
      close();
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  return (
    <nav ref={navRef} aria-label={messages.layout.mainNav} className={styles.nav} data-nav="main">
      <button
        ref={toggleRef}
        type="button"
        className={styles.toggle}
        aria-expanded={isOpen}
        aria-controls={PANEL_ID}
        onClick={() => setOpenOn(isOpen ? null : pathname)}
      >
        {messages.layout.menu}
      </button>
      <div id={PANEL_ID} className={styles.panel} data-open={isOpen}>
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end ?? false}
                viewTransition
                // CSS module keys are typed `string | undefined`; NavLink's className rejects undefined.
                className={styles.link ?? ''}
                onClick={close}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        {panelFooter && <div className={styles.panelFooter}>{panelFooter}</div>}
      </div>
    </nav>
  );
}

export default Nav;
