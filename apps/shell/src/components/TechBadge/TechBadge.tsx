import { useLocale, useMessages } from '../../i18n/context.ts';
import { text } from '../../i18n/localized.ts';
import { type TechId, technologies } from '../../sections/technologies.ts';
import styles from './TechBadge.module.css';

interface TechBadgeProps {
  tech: TechId;
  status?: 'live' | 'planned';
}

/** Text-only technology pill. Planned technologies say "planned" in words, not just styling. */
function TechBadge({ tech, status = 'live' }: TechBadgeProps) {
  const { label, tone } = technologies[tech];
  const messages = useMessages();
  const locale = useLocale();

  return (
    <span className={styles.badge} data-tone={tone} data-status={status}>
      <span className={styles.dot} aria-hidden="true" />
      {text(label, locale)}
      {status === 'planned' && (
        <>
          {' '}
          <span className={styles.status}>{messages.tech.planned}</span>
        </>
      )}
    </span>
  );
}

export default TechBadge;
