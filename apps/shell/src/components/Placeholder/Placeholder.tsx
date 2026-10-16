import {
  type Content,
  isPlaceholder,
  type Placeholder as PlaceholderContent,
} from '../../content/placeholder.ts';
import styles from './Placeholder.module.css';

/** Visible marker for content that still needs confirmation. Never rendered as a link. */
export function Placeholder({ placeholder }: { placeholder: PlaceholderContent }) {
  return <span className={styles.placeholder}>To confirm: {placeholder.todo}</span>;
}

/** Renders confirmed text as-is, or a placeholder chip. */
export function Text({ value }: { value: Content }) {
  return isPlaceholder(value) ? <Placeholder placeholder={value} /> : value;
}
