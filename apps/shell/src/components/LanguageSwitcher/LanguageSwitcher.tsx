import { Link, useLocation } from 'react-router';
import { useLocale, useMessages } from '../../i18n/context.ts';
import { LOCALES, localeConfig, switchLocalePath } from '../../i18n/locales.ts';
import styles from './LanguageSwitcher.module.css';

/**
 * EN / PT links to the same page in each language (ADR-0007). They are real links, so they
 * work like any navigation (no reload, back/forward, open in new tab) and can be crawled.
 * The scroll position is kept; focus moves to the new page's heading like on any navigation.
 *
 * Each link is marked with its own language, so its name ("PT — Português (Brasil)") is
 * pronounced correctly, and its name starts with the visible label (WCAG 2.5.3).
 */
function LanguageSwitcher() {
  const locale = useLocale();
  const messages = useMessages();
  const location = useLocation();

  return (
    <nav aria-label={messages.layout.languageNav} className={styles.switcher}>
      <ul className={styles.list}>
        {LOCALES.map((target) => {
          const { short, name, htmlLang } = localeConfig[target];
          return (
            <li key={target}>
              <Link
                to={switchLocalePath(location, target)}
                className={styles.link}
                lang={htmlLang}
                hrefLang={htmlLang}
                aria-label={`${short} — ${name}`}
                aria-current={target === locale ? 'true' : undefined}
                preventScrollReset
              >
                {short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default LanguageSwitcher;
