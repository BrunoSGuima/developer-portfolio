import type { NavItem } from '../components/Nav/Nav.tsx';

// TEMPORARY: replaced by the section registry in Step 3.
export const navItems: readonly NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Projects', href: '/projects' },
  { label: 'Architecture', href: '/architecture' },
  { label: 'Contact', href: '/contact' },
];
