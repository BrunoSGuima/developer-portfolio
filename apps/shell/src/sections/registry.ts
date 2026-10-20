import type { ComponentType } from 'react';
import type { Locale } from '../i18n/locales.ts';
import { type Localized, pick } from '../i18n/localized.ts';
import type { TechId } from './technologies.ts';

/**
 * Section registry — the single source of truth for every section of the portfolio.
 *
 * Routes, the main navigation and the Fun Fact are all derived from this list.
 * Describe only what is actually implemented: the Fun Fact and Architecture page rely on it.
 * User-facing text is `Localized` (every language); paths are language-neutral (see i18n).
 */

export type Framework = 'react' | 'vue';
export type Backend = 'none' | 'rails' | 'fastapi';
export type SectionStatus = 'live' | 'planned';

/** A React page bundled with the shell, loaded on first visit. */
export interface ReactMount {
  kind: 'react';
  load: () => Promise<{ default: ComponentType }>;
}

/**
 * An independently built app (e.g. Vue) mounted by the shell through the contract in
 * `microfrontends/contract.ts` (ADR-0002). Create it with `remoteMount()`.
 */
export interface RemoteMount {
  kind: 'remote';
  /** Same-origin URL of the app's ES module entry, e.g. '/apps/career/entry.js'. */
  entry: string;
  /** Loads the module; RemoteSection validates its shape at runtime. */
  load: () => Promise<unknown>;
}

/** How the shell renders a section. */
export type SectionMount = ReactMount | RemoteMount;

export function remoteMount(entry: string): RemoteMount {
  return {
    kind: 'remote',
    entry,
    load: () => import(/* @vite-ignore */ entry) as Promise<unknown>,
  };
}

/**
 * What the Fun Fact says about a section. Must describe only what exists today; technologies
 * that are coming later go in `plannedTech`, where they are visibly labelled "planned".
 */
export interface FunFact {
  text: Localized<string>;
  /** Technologies this section is actually built with. */
  tech: readonly TechId[];
  plannedTech?: readonly TechId[];
}

export interface Section {
  id: string;
  path: string;
  /** Text in the main navigation. */
  label: Localized<string>;
  /** Page heading and document title. */
  title: Localized<string>;
  /** The page's meta description. */
  description: Localized<string>;
  framework: Framework;
  backend: Backend;
  status: SectionStatus;
  mount: SectionMount;
  funFact: FunFact;
  /**
   * Where the Fun Fact sits on this page from 64rem: 'aside' puts it in a right-hand column so
   * the content starts near the top; 'intro' puts it beside the page's intro, with the content
   * full width below (the page must render `PageIntro`). Defaults to 'stacked' (above).
   */
  contextPlacement?: 'stacked' | 'aside' | 'intro';
}

export const sections: readonly Section[] = [
  {
    id: 'home',
    path: '/',
    label: { en: 'Home', 'pt-BR': 'Início' },
    title: { en: 'Home', 'pt-BR': 'Início' },
    description: {
      en: 'Bruno Guimarães, Full-Stack Software Engineer (Ruby on Rails, React, Vue.js). Interactive developer portfolio.',
      'pt-BR':
        'Bruno Guimarães, Engenheiro de Software Full-Stack (Ruby on Rails, React, Vue.js). Portfólio interativo de desenvolvedor.',
    },
    framework: 'react',
    backend: 'none',
    status: 'live',
    mount: { kind: 'react', load: () => import('./home/HomePage.tsx') },
    funFact: {
      text: {
        en: "This page is built with React and TypeScript and bundled by Vite. There's no backend yet: everything you see is static data, served as plain files.",
        'pt-BR':
          'Esta página é feita com React e TypeScript e empacotada pelo Vite. Ainda não há backend: tudo o que você vê são dados estáticos, servidos como arquivos simples.',
      },
      tech: ['react', 'typescript', 'vite'],
    },
  },
  {
    id: 'about',
    path: '/about',
    label: { en: 'About', 'pt-BR': 'Sobre' },
    title: { en: 'About', 'pt-BR': 'Sobre' },
    description: {
      en: 'About Bruno Guimarães: experience with Ruby on Rails, React and Vue.js, skills, education and languages.',
      'pt-BR':
        'Sobre Bruno Guimarães: experiência com Ruby on Rails, React e Vue.js, habilidades, formação e idiomas.',
    },
    framework: 'react',
    backend: 'none',
    status: 'live',
    contextPlacement: 'aside',
    mount: { kind: 'react', load: () => import('./about/AboutPage.tsx') },
    funFact: {
      text: {
        en: 'This section is a React component loaded on demand. Your browser only downloaded its code when you opened it.',
        'pt-BR':
          'Esta seção é um componente React carregado sob demanda. Seu navegador só baixou o código dela quando você a abriu.',
      },
      tech: ['react', 'typescript', 'react-router'],
    },
  },
  {
    id: 'projects',
    path: '/projects',
    label: { en: 'Projects', 'pt-BR': 'Projetos' },
    title: { en: 'Projects', 'pt-BR': 'Projetos' },
    description: {
      en: 'Public projects by Bruno Guimarães, starting with this portfolio.',
      'pt-BR': 'Projetos públicos de Bruno Guimarães, começando por este portfólio.',
    },
    framework: 'react',
    backend: 'none',
    status: 'live',
    mount: { kind: 'react', load: () => import('./projects/ProjectsPage.tsx') },
    funFact: {
      text: {
        en: 'These project cards are rendered by React from typed static data bundled with the page. A Ruby on Rails API is planned to serve them.',
        'pt-BR':
          'Estes cards de projetos são renderizados pelo React a partir de dados estáticos tipados, empacotados com a página. Uma API em Ruby on Rails está planejada para servi-los.',
      },
      tech: ['react', 'typescript'],
      plannedTech: ['rails'],
    },
    contextPlacement: 'intro',
  },
  {
    id: 'architecture',
    path: '/architecture',
    label: { en: 'Architecture', 'pt-BR': 'Arquitetura' },
    title: { en: 'Architecture', 'pt-BR': 'Arquitetura' },
    description: {
      en: 'How this portfolio is built today and how it will evolve: components, roadmap and key decisions.',
      'pt-BR':
        'Como este portfólio é construído hoje e como vai evoluir: componentes, roadmap e principais decisões.',
    },
    framework: 'react',
    backend: 'none',
    status: 'live',
    mount: { kind: 'react', load: () => import('./architecture/ArchitecturePage.tsx') },
    funFact: {
      text: {
        en: 'The whole site is one React app: a persistent shell that swaps sections without reloading the page. A Vue.js section, mounted by this React shell, is planned.',
        'pt-BR':
          'O site inteiro é uma única aplicação React: um shell persistente que troca as seções sem recarregar a página. Uma seção em Vue.js, montada por este shell em React, está planejada.',
      },
      tech: ['react', 'react-router', 'vite'],
      plannedTech: ['vue'],
    },
    contextPlacement: 'intro',
  },
  {
    id: 'contact',
    path: '/contact',
    label: { en: 'Contact', 'pt-BR': 'Contato' },
    title: { en: 'Contact', 'pt-BR': 'Contato' },
    description: {
      en: 'How to reach Bruno Guimarães: email, LinkedIn and GitHub.',
      'pt-BR': 'Como falar com Bruno Guimarães: e-mail, LinkedIn e GitHub.',
    },
    framework: 'react',
    backend: 'none',
    status: 'live',
    contextPlacement: 'aside',
    mount: { kind: 'react', load: () => import('./contact/ContactPage.tsx') },
    funFact: {
      text: {
        en: 'No contact form here: this site has no backend yet, so this page simply links to ways to reach me, and nothing you type is collected.',
        'pt-BR':
          'Não há formulário de contato aqui: este site ainda não tem backend, então esta página apenas indica formas de falar comigo, e nada do que você digita é coletado.',
      },
      tech: ['react', 'typescript'],
    },
  },
];

/** Shown when no section matches the URL (not-found and error pages). */
export const shellFunFact: FunFact = {
  text: {
    en: "Even this page is rendered by the React shell. The address didn't match any section, so the router showed this page instead.",
    'pt-BR':
      'Até esta página é renderizada pelo shell em React. O endereço não correspondeu a nenhuma seção, então o roteador exibiu esta página no lugar.',
  },
  tech: ['react', 'react-router'],
};

/** Sections that are routed and shown in the navigation, in registry order. */
export const liveSections: readonly Section[] = sections.filter(
  (section) => section.status === 'live',
);

export function getSection(id: string): Section | undefined {
  return sections.find((section) => section.id === id);
}

/** A section's page heading in the given language (the same text as its document title). */
export function sectionTitle(id: string, locale: Locale): string {
  const section = getSection(id);
  return section ? pick(section.title, locale) : id;
}
