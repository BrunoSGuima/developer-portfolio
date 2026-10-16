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
 * fade-in replays when the section changes. No aria-live: focus already moves to the new page
 * heading on navigation, and the landmark keeps the Fun Fact reachable.
 */
function FunFact({ fact }: FunFactProps) {
  return (
    <aside aria-label="Fun fact" className={styles.card}>
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          className={styles.bulb}
          d="M12 2.5a6.5 6.5 0 0 0-3.9 11.7c.6.5.9 1.1.9 1.8v.5h6V16c0-.7.3-1.3.9-1.8A6.5 6.5 0 0 0 12 2.5Z"
        />
        <path className={styles.base} d="M9.5 18.5h5M10 21h4" />
      </svg>
      <div key={fact.text} className={styles.content}>
        <p className={styles.label}>
          <strong>Fun Fact</strong>
        </p>
        <p className={styles.text}>{fact.text}</p>
        <ul aria-label="Technologies" className={styles.badges}>
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
