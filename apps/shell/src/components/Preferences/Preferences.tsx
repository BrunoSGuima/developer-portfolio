import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher.tsx';
import ThemeToggle from '../ThemeToggle/ThemeToggle.tsx';
import styles from './Preferences.module.css';

/**
 * The visitor's preferences in one compact pill: EN/PT (a navigation of links, ADR-0007) and the
 * theme toggle (a button, ADR-0017). One pill instead of two keeps the desktop header on one
 * line down to 1024px with classic scrollbars.
 */
function Preferences() {
  return (
    <div className={styles.pill} data-preferences>
      <LanguageSwitcher />
      <ThemeToggle />
    </div>
  );
}

export default Preferences;
