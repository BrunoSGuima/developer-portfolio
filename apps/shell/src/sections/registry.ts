import type { ComponentType } from 'react';
import type { TechId } from './technologies.ts';

/**
 * Section registry — the single source of truth for every section of the portfolio.
 *
 * Routes, the main navigation and the Fun Fact are all derived from this list.
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

/**
 * What the Fun Fact says about a section. Must describe only what exists today; technologies
 * that are coming later go in `plannedTech`, where they are visibly labelled "planned".
 */
export interface FunFact {
  text: string;
  /** Technologies this section is actually built with. */
  tech: readonly TechId[];
  plannedTech?: readonly TechId[];
}

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
  funFact: FunFact;
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
    funFact: {
      text: "This page is built with React and TypeScript and bundled by Vite. There's no backend yet: everything you see is static data, served as plain files.",
      tech: ['react', 'typescript', 'vite'],
    },
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
    funFact: {
      text: 'This section is a React component loaded on demand. Your browser only downloaded its code when you opened it.',
      tech: ['react', 'typescript', 'react-router'],
    },
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
    funFact: {
      text: 'These project cards are rendered by React from typed static data bundled with the page. A Ruby on Rails API is planned to serve them.',
      tech: ['react', 'typescript'],
      plannedTech: ['rails'],
    },
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
    funFact: {
      text: 'The whole site is one React app: a persistent shell that swaps sections without reloading the page. A Vue.js section, mounted by this React shell, is planned.',
      tech: ['react', 'react-router', 'vite'],
      plannedTech: ['vue'],
    },
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
    funFact: {
      text: 'No contact form here: this site has no backend yet, so this page simply links to ways to reach me, and nothing you type is collected.',
      tech: ['react', 'typescript'],
    },
  },
];

/** Shown when no section matches the URL (not-found and error pages). */
export const shellFunFact: FunFact = {
  text: "Even this page is rendered by the React shell. The address didn't match any section, so the router showed this page instead.",
  tech: ['react', 'react-router'],
};

/** Sections that are routed and shown in the navigation, in registry order. */
export const liveSections: readonly Section[] = sections.filter(
  (section) => section.status === 'live',
);

export function getSection(id: string): Section | undefined {
  return sections.find((section) => section.id === id);
}
