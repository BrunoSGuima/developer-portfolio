import type { Status } from './status.ts';

// Describe only what exists: anything not built yet is 'planned'. architecture.test.ts checks
// these statuses against the section registry.

export interface ArchitectureComponent {
  id: string;
  name: string;
  description: string;
  status: Status;
}

// Order matters on the page: neighbours in the two-column grid have similar amounts of text.
export const components: readonly ArchitectureComponent[] = [
  {
    id: 'react-shell',
    name: 'React shell',
    description: 'Layout, navigation and Fun Fact; stays mounted while sections change.',
    status: 'live',
  },
  {
    id: 'section-registry',
    name: 'Section registry',
    description: 'Single source of truth for sections, routes and Fun Facts.',
    status: 'live',
  },
  {
    id: 'mascot',
    name: 'Mascot guide',
    description:
      'The Home and Fun Fact mascot uses the final illustrations; the walking navigation mascot still uses placeholder art until its final frames are ready.',
    status: 'live',
  },
  {
    id: 'microfrontend-host',
    name: 'Microfrontend host',
    description:
      "The React shell can load and mount independently built apps through a small mount/unmount contract. It's tested with a plain-JavaScript stand-in; no real remote section is mounted yet.",
    status: 'live',
  },
  {
    id: 'static-hosting',
    name: 'Static hosting',
    description: 'Served as static files; deployment not set up yet.',
    status: 'planned',
  },
  {
    id: 'routing',
    name: 'Client-side routing',
    description: 'React Router; each section loads on demand.',
    status: 'live',
  },
  {
    id: 'vue-microfrontend',
    name: 'Vue.js microfrontend',
    description: 'An independently built section mounted by the React shell.',
    status: 'planned',
  },
  {
    id: 'rails-api',
    name: 'Ruby on Rails API + PostgreSQL',
    description: 'Profile, projects and career data.',
    status: 'planned',
  },
  {
    id: 'fastapi-service',
    name: 'Python FastAPI service',
    description: 'Quizzes, experiments and future AI features.',
    status: 'planned',
  },
  {
    id: 'background-jobs',
    name: 'Redis + Sidekiq',
    description: 'Background jobs with retries and status tracking.',
    status: 'planned',
  },
  {
    id: 'ci-cd',
    name: 'CI/CD (GitHub Actions)',
    description: 'Automated checks and deployment.',
    status: 'planned',
  },
];

export interface Milestone {
  version: string;
  name: string;
  status: Status;
}

/** In delivery order. */
export const timeline: readonly Milestone[] = [
  { version: 'v1', name: 'React MVP', status: 'in-progress' },
  { version: 'v2', name: 'Rails API + PostgreSQL', status: 'planned' },
  { version: 'v3', name: 'Vue microfrontend', status: 'planned' },
  { version: 'v4', name: 'Python FastAPI', status: 'planned' },
  { version: 'v5', name: 'Background processing', status: 'planned' },
  { version: 'v6', name: 'AI engineering experiments', status: 'planned' },
];

export interface Decision {
  id: string;
  title: string;
  summary: string;
}

/** Accepted Architecture Decision Records (docs/adr). */
export const decisions: readonly Decision[] = [
  {
    id: 'ADR-0001',
    title: 'React SPA as the persistent shell',
    summary:
      'One React app owns navigation, layout and the Fun Fact, and stays mounted while sections change.',
  },
  {
    id: 'ADR-0002',
    title: 'Framework-agnostic mount contract',
    summary:
      'Future microfrontends expose mount() and unmount(), so a Vue app can live inside the React shell.',
  },
  {
    id: 'ADR-0003',
    title: 'CSS Modules and design tokens',
    summary:
      'Plain CSS with shared custom properties, so React and Vue sections share one visual language.',
  },
  {
    id: 'ADR-0004',
    title: 'Routes generated from a section registry',
    summary:
      'React Router routes, navigation and Fun Facts all come from a single list of sections.',
  },
];
