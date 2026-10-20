import type { Status } from '../../content/status.ts';
import { useMessages } from '../../i18n/context.ts';
import styles from './StatusTag.module.css';

/** Delivery status as a word (never colour alone), in the active language. */
function StatusTag({ status }: { status: Status }) {
  const messages = useMessages();

  return (
    <span className={styles.tag} data-status={status}>
      {messages.status[status]}
    </span>
  );
}

export default StatusTag;
