import type { ComponentType } from 'react';

/**
 * Section registry — the single source of truth for every section of the portfolio.
 *
 * Routes, the main navigation and (from Step 4) the Fun Fact are all derived from this list.
 * Describe only what is actually implemented: the Fun Fact and Architecture page rely on it.
 */

export type Framework = 'react' | 'vue';
export type Backend = 'none' | 'rails' | 'fastapi';
export type SectionStatus = 'live' | 'planned';

/** A React page bundled with the shell, loaded on first visit. */
export interface ReactMount {
  kind: 'react';
  load: () => Promise<{ default: ComponentType }>;
}

/** How the shell renders a section. Step 6 adds a `remote` variant for microfrontends. */
export type SectionMount = ReactMount;

export interface Section {
  id: string;
  path: string;
  /** Text in the main navigation. */
  label: string;
  /** Page heading and document title. */
  title: string;
  framework: Framework;
  backend: Backend;
  status: SectionStatus;
  mount: SectionMount;
}

export const sections: readonly Section[] = [
  {
    id: 'home',
    path: '/',
    label: 'Home',
    title: 'Home',
    framework: 'react',
    backend: 'none',
    status: 'live',
    mount: { kind: 'react', load: () => import('./home/HomePage.tsx') },
  },
  {
    id: 'about',
    path: '/about',
    label: 'About',
    title: 'About',
    framework: 'react',
    backend: 'none',
    status: 'live',
    mount: { kind: 'react', load: () => import('./about/AboutPage.tsx') },
  },
  {
    id: 'projects',
    path: '/projects',
    label: 'Projects',
    title: 'Projects',
    framework: 'react',
    backend: 'none',
    status: 'live',
    mount: { kind: 'react', load: () => import('./projects/ProjectsPage.tsx') },
  },
  {
    id: 'architecture',
    path: '/architecture',
    label: 'Architecture',
    title: 'Architecture',
    framework: 'react',
    backend: 'none',
    status: 'live',
    mount: { kind: 'react', load: () => import('./architecture/ArchitecturePage.tsx') },
  },
  {
    id: 'contact',
    path: '/contact',
    label: 'Contact',
    title: 'Contact',
    framework: 'react',
    backend: 'none',
    status: 'live',
    mount: { kind: 'react', load: () => import('./contact/ContactPage.tsx') },
  },
];

/** Sections that are routed and shown in the navigation, in registry order. */
export const liveSections: readonly Section[] = sections.filter(
  (section) => section.status === 'live',
);

export function getSection(id: string): Section | undefined {
  return sections.find((section) => section.id === id);
}
