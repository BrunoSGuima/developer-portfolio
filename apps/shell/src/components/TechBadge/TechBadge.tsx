import { type TechId, technologies } from '../../sections/technologies.ts';
import styles from './TechBadge.module.css';

interface TechBadgeProps {
  tech: TechId;
  status?: 'live' | 'planned';
}

/** Text-only technology pill. Planned technologies say "planned" in words, not just styling. */
function TechBadge({ tech, status = 'live' }: TechBadgeProps) {
  const { label, tone } = technologies[tech];

  return (
    <span className={styles.badge} data-tone={tone} data-status={status}>
      <span className={styles.dot} aria-hidden="true" />
      {label}
      {status === 'planned' && (
        <>
          {' '}
          <span className={styles.status}>planned</span>
        </>
      )}
    </span>
  );
}

export default TechBadge;
