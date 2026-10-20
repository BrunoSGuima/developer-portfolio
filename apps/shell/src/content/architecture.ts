import type { Localized, Text } from '../i18n/localized.ts';
import type { Status } from './status.ts';

// Describe only what exists: anything not built yet is 'planned'. architecture.test.ts checks
// these statuses against the section registry.

export interface ArchitectureComponent {
  id: string;
  name: Text;
  description: Localized<string>;
  status: Status;
}

// Order matters on the page: neighbours in the two-column grid have similar amounts of text.
export const components: readonly ArchitectureComponent[] = [
  {
    id: 'react-shell',
    name: { en: 'React shell', 'pt-BR': 'Shell em React' },
    description: {
      en: 'Layout, navigation and Fun Fact; stays mounted while sections change.',
      'pt-BR': 'Layout, navegação e Curiosidade; continua montado enquanto as seções mudam.',
    },
    status: 'live',
  },
  {
    id: 'section-registry',
    name: { en: 'Section registry', 'pt-BR': 'Registro de seções' },
    description: {
      en: 'Single source of truth for sections, routes and Fun Facts.',
      'pt-BR': 'Fonte única de verdade para seções, rotas e Curiosidades.',
    },
    status: 'live',
  },
  {
    id: 'mascot',
    name: { en: 'Mascot guide', 'pt-BR': 'Mascote guia' },
    description: {
      en: 'The Home and Fun Fact mascot uses the final illustrations; the walking navigation mascot still uses placeholder art until its final frames are ready.',
      'pt-BR':
        'O mascote da página inicial e da Curiosidade usa as ilustrações finais; o mascote que caminha pela navegação ainda usa uma arte provisória até que seus quadros finais fiquem prontos.',
    },
    status: 'live',
  },
  {
    id: 'microfrontend-host',
    name: { en: 'Microfrontend host', 'pt-BR': 'Host de microfrontends' },
    description: {
      en: "The React shell can load and mount independently built apps through a small mount/unmount contract. It's tested with a plain-JavaScript stand-in; no real remote section is mounted yet.",
      'pt-BR':
        'O shell em React consegue carregar e montar aplicações construídas de forma independente por meio de um pequeno contrato de mount/unmount. Ele é testado com uma aplicação simulada em JavaScript puro; nenhuma seção remota real está montada ainda.',
    },
    status: 'live',
  },
  {
    id: 'static-hosting',
    name: { en: 'Static hosting', 'pt-BR': 'Hospedagem estática' },
    description: {
      en: 'Served as static files; deployment not set up yet.',
      'pt-BR': 'Servido como arquivos estáticos; o deploy ainda não foi configurado.',
    },
    status: 'planned',
  },
  {
    id: 'routing',
    name: { en: 'Client-side routing', 'pt-BR': 'Roteamento no navegador' },
    description: {
      en: 'React Router; each section loads on demand.',
      'pt-BR': 'React Router; cada seção é carregada sob demanda.',
    },
    status: 'live',
  },
  {
    id: 'vue-microfrontend',
    name: { en: 'Vue.js microfrontend', 'pt-BR': 'Microfrontend em Vue.js' },
    description: {
      en: 'An independently built section mounted by the React shell.',
      'pt-BR': 'Uma seção construída de forma independente e montada pelo shell em React.',
    },
    status: 'planned',
  },
  {
    id: 'rails-api',
    name: 'Ruby on Rails API + PostgreSQL',
    description: {
      en: 'Profile, projects and career data.',
      'pt-BR': 'Dados de perfil, projetos e carreira.',
    },
    status: 'planned',
  },
  {
    id: 'fastapi-service',
    name: { en: 'Python FastAPI service', 'pt-BR': 'Serviço em Python FastAPI' },
    description: {
      en: 'Quizzes, experiments and future AI features.',
      'pt-BR': 'Quizzes, experimentos e futuros recursos de IA.',
    },
    status: 'planned',
  },
  {
    id: 'background-jobs',
    name: 'Redis + Sidekiq',
    description: {
      en: 'Background jobs with retries and status tracking.',
      'pt-BR': 'Jobs em segundo plano com novas tentativas e acompanhamento de status.',
    },
    status: 'planned',
  },
  {
    id: 'ci-cd',
    name: 'CI/CD (GitHub Actions)',
    description: {
      en: 'Automated checks and deployment.',
      'pt-BR': 'Verificações automatizadas e deploy.',
    },
    status: 'planned',
  },
];

export interface Milestone {
  version: string;
  name: Localized<string>;
  status: Status;
}

/** In delivery order. */
export const timeline: readonly Milestone[] = [
  { version: 'v1', name: { en: 'React MVP', 'pt-BR': 'MVP em React' }, status: 'in-progress' },
  {
    version: 'v2',
    name: { en: 'Rails API + PostgreSQL', 'pt-BR': 'API em Rails + PostgreSQL' },
    status: 'planned',
  },
  {
    version: 'v3',
    name: { en: 'Vue microfrontend', 'pt-BR': 'Microfrontend em Vue' },
    status: 'planned',
  },
  {
    version: 'v4',
    name: { en: 'Python FastAPI', 'pt-BR': 'Python FastAPI' },
    status: 'planned',
  },
  {
    version: 'v5',
    name: { en: 'Background processing', 'pt-BR': 'Processamento em segundo plano' },
    status: 'planned',
  },
  {
    version: 'v6',
    name: { en: 'AI engineering experiments', 'pt-BR': 'Experimentos de engenharia de IA' },
    status: 'planned',
  },
];

export interface Decision {
  id: string;
  title: Localized<string>;
  summary: Localized<string>;
}

/** Accepted Architecture Decision Records (docs/adr). */
export const decisions: readonly Decision[] = [
  {
    id: 'ADR-0001',
    title: {
      en: 'React SPA as the persistent shell',
      'pt-BR': 'SPA em React como shell persistente',
    },
    summary: {
      en: 'One React app owns navigation, layout and the Fun Fact, and stays mounted while sections change.',
      'pt-BR':
        'Uma única aplicação React controla a navegação, o layout e a Curiosidade, e continua montada enquanto as seções mudam.',
    },
  },
  {
    id: 'ADR-0002',
    title: {
      en: 'Framework-agnostic mount contract',
      'pt-BR': 'Contrato de montagem independente de framework',
    },
    summary: {
      en: 'Future microfrontends expose mount() and unmount(), so a Vue app can live inside the React shell.',
      'pt-BR':
        'Os futuros microfrontends expõem mount() e unmount(), para que uma aplicação Vue possa funcionar dentro do shell em React.',
    },
  },
  {
    id: 'ADR-0003',
    title: { en: 'CSS Modules and design tokens', 'pt-BR': 'CSS Modules e design tokens' },
    summary: {
      en: 'Plain CSS with shared custom properties, so React and Vue sections share one visual language.',
      'pt-BR':
        'CSS puro com custom properties compartilhadas, para que as seções em React e Vue tenham a mesma linguagem visual.',
    },
  },
  {
    id: 'ADR-0004',
    title: {
      en: 'Routes generated from a section registry',
      'pt-BR': 'Rotas geradas a partir de um registro de seções',
    },
    summary: {
      en: 'React Router routes, navigation and Fun Facts all come from a single list of sections.',
      'pt-BR':
        'As rotas do React Router, a navegação e as Curiosidades vêm todas de uma única lista de seções.',
    },
  },
];
