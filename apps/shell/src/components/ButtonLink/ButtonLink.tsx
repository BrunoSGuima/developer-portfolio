import type { ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './ButtonLink.module.css';

interface ButtonLinkProps {
  to: string;
  variant?: 'primary' | 'secondary';
  children: ReactNode;
}

/** An internal navigation link styled as a button (it navigates, so it stays a link). */
function ButtonLink({ to, variant = 'primary', children }: ButtonLinkProps) {
  return (
    <Link to={to} className={styles.button} data-variant={variant} viewTransition>
      {children}
    </Link>
  );
}

export default ButtonLink;
