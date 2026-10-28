import { useMessages } from '../../i18n/context.ts';
import { chooseTheme } from '../../theme/theme.ts';
import { useTheme } from '../../theme/useTheme.ts';
import styles from './ThemeToggle.module.css';

/**
 * The light/dark toggle (ADR-0017), beside the language switcher: a button named "Dark theme",
 * pressed while the dark theme is on. Choosing stores the visitor's preference; until then the
 * site follows the system. The moon is decorative; the state is the pressed fill (an outline in
 * forced colours), never colour alone. Focus stays on the button. It sits in the preferences pill
 * (components/Preferences).
 */
function ThemeToggle() {
  const messages = useMessages();
  const dark = useTheme() === 'dark';

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={dark}
      title={messages.layout.themeToggle}
      data-theme-toggle
      onClick={() => chooseTheme(dark ? 'light' : 'dark')}
    >
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M20 14.6A8.5 8.5 0 0 1 9.4 4a8.5 8.5 0 1 0 10.6 10.6Z" />
      </svg>
      <span className="visually-hidden">{messages.layout.themeToggle}</span>
    </button>
  );
}

export default ThemeToggle;
