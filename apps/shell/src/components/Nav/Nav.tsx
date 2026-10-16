import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router';
import styles from './Nav.module.css';

export interface NavItem {
  label: string;
  to: string;
}

interface NavProps {
  items: readonly NavItem[];
}

const LIST_ID = 'primary-nav-list';

/**
 * Main navigation (a disclosure on small screens).
 *
 * The <nav> landmark and its Menu button are always present; only the list collapses. On small
 * screens the open list is a panel below the header. It is not modal, so there is no focus trap:
 * Escape, clicking outside, or choosing a link closes it. On wide screens the button is hidden
 * by CSS and the list is always shown inline.
 *
 * Links are router NavLinks: navigation happens client-side and the active link gets
 * aria-current="page" automatically ("/" only matches exactly, via `end`).
 */
function Nav({ items }: NavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      toggleRef.current?.focus();
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && navRef.current?.contains(event.target)) return;
      setIsOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  return (
    <nav ref={navRef} aria-label="Main" className={styles.nav}>
      <button
        ref={toggleRef}
        type="button"
        className={styles.toggle}
        aria-expanded={isOpen}
        aria-controls={LIST_ID}
        onClick={() => setIsOpen((open) => !open)}
      >
        Menu
      </button>
      <ul id={LIST_ID} className={styles.list} data-open={isOpen}>
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              // CSS module keys are typed `string | undefined`; NavLink's className rejects undefined.
              className={styles.link ?? ''}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Nav;
