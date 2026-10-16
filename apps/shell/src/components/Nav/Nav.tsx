import { useEffect, useRef, useState } from 'react';
import styles from './Nav.module.css';

export interface NavItem {
  label: string;
  href: string;
}

interface NavProps {
  items: readonly NavItem[];
  currentPath: string;
}

const LIST_ID = 'primary-nav-list';

/**
 * Main navigation (a disclosure on small screens).
 *
 * The <nav> landmark and its Menu button are always present; only the list collapses. On small
 * screens the open list is a panel below the header. It is not modal, so there is no focus trap:
 * Escape, clicking outside, or choosing a link closes it. On wide screens the button is hidden
 * by CSS and the list is always shown inline.
 */
function Nav({ items, currentPath }: NavProps) {
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
          <li key={item.href}>
            <a
              href={item.href}
              className={styles.link}
              aria-current={item.href === currentPath ? 'page' : undefined}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Nav;
