import type { Status } from '../../content/status.ts';
import { useMessages } from '../../i18n/context.ts';
import styles from './StatusTag.module.css';

/**
 * Delivery status as a word (never colour alone), in the active language. `label` replaces the
 * usual word for that status.
 */
function StatusTag({ status, label }: { status: Status; label?: string }) {
  const messages = useMessages();

  return (
    <span className={styles.tag} data-status={status}>
      {label ?? messages.status[status]}
    </span>
  );
}

export default StatusTag;
