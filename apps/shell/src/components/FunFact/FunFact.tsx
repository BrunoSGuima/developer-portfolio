import { useLocale, useMessages } from '../../i18n/context.ts';
import { pick } from '../../i18n/localized.ts';
import type { FunFact as FunFactContent } from '../../sections/registry.ts';
import TechBadge from '../TechBadge/TechBadge.tsx';
import styles from './FunFact.module.css';

interface FunFactProps {
  fact: FunFactContent;
}

/**
 * Persistent card explaining the technology behind the current section.
 *
 * The <aside> stays mounted across navigation; the inner content is keyed by its text so the
 * fade-in replays when the section (or the language) changes. No aria-live: focus already moves to the new page
 * heading on navigation, and the landmark keeps the Fun Fact reachable.
 */
function FunFact({ fact }: FunFactProps) {
  const locale = useLocale();
  const messages = useMessages();
  const text = pick(fact.text, locale);

  return (
    <aside aria-label={messages.funFact.region} className={styles.card} data-fun-fact>
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          className={styles.bulb}
          d="M12 2.5a6.5 6.5 0 0 0-3.9 11.7c.6.5.9 1.1.9 1.8v.5h6V16c0-.7.3-1.3.9-1.8A6.5 6.5 0 0 0 12 2.5Z"
        />
        <path className={styles.base} d="M9.5 18.5h5M10 21h4" />
      </svg>
      <div key={text} className={styles.content}>
        <p className={styles.label}>
          <strong>{messages.funFact.label}</strong>
        </p>
        <p className={styles.text}>{text}</p>
        <ul aria-label={messages.funFact.technologies} className={styles.badges}>
          {fact.tech.map((tech) => (
            <li key={tech}>
              <TechBadge tech={tech} />
            </li>
          ))}
          {fact.plannedTech?.map((tech) => (
            <li key={tech}>
              <TechBadge tech={tech} status="planned" />
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default FunFact;
