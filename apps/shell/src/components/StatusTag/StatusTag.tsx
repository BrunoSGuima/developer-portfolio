import type { Status } from '../../content/status.ts';
import styles from './StatusTag.module.css';

const LABELS: Record<Status, string> = {
  live: 'Live',
  'in-progress': 'In progress',
  planned: 'Planned',
};

/** Delivery status as a word (never colour alone). */
function StatusTag({ status }: { status: Status }) {
  return (
    <span className={styles.tag} data-status={status}>
      {LABELS[status]}
    </span>
  );
}

export default StatusTag;
