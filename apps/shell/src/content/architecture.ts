import type { AppMode } from '../config/mode.ts';
import type { Localized, Text } from '../i18n/localized.ts';
import type { Status } from './status.ts';

// Describe only what exists: anything not built yet is 'planned'. architecture.test.ts checks
// these statuses against the section registry. The public site is the static build only
// (ADR-0016): the Rails API and PostgreSQL are built and tested but run locally, so nothing here
// may say they are hosted.

export interface ArchitectureComponent {
  id: string;
  name: Text;
  description: Localized<string>;
  status: Status;
}

// "How it's built today" lists only what is implemented (all done; 'live' once the site is
// published, Step 4.12); planned work lives in the timeline. Reading order: architecture
// foundations, then cross-cutting features, then quality.
export const components: readonly ArchitectureComponent[] = [
  {
    id: 'react-shell',
    name: { en: 'React shell', 'pt-BR': 'Shell em React' },
    description: {
      en: 'Layout, navigation and Fun Fact; stays mounted while sections change.',
      'pt-BR': 'Layout, navegação e Curiosidade; continua montado enquanto as seções mudam.',
    },
    status: 'done',
  },
  {
    id: 'section-registry',
    name: { en: 'Section registry', 'pt-BR': 'Registro de seções' },
    description: {
      en: 'Single source of truth for sections, routes and Fun Facts.',
      'pt-BR': 'Fonte única de verdade para seções, rotas e Curiosidades.',
    },
    status: 'done',
  },
  {
    id: 'routing',
    name: { en: 'Routing and page transitions', 'pt-BR': 'Roteamento e transições de página' },
    description: {
      en: 'React Router loads each section on demand; page changes crossfade with View Transitions, instantly with reduced motion.',
      'pt-BR':
        'O React Router carrega cada seção sob demanda; as trocas de página usam um fade suave com View Transitions, instantâneo com movimento reduzido.',
    },
    status: 'done',
  },
  {
    id: 'microfrontend-host',
    name: { en: 'Microfrontend host', 'pt-BR': 'Host de microfrontends' },
    description: {
      en: "The React shell can load and mount independently built apps through a small mount/unmount contract. It's tested with a plain-JavaScript stand-in; no real remote section is mounted yet.",
      'pt-BR':
        'O shell em React consegue carregar e montar aplicações construídas de forma independente por meio de um pequeno contrato de mount/unmount. Ele é testado com uma aplicação simulada em JavaScript puro; nenhuma seção remota real está montada ainda.',
    },
    status: 'done',
  },
  {
    id: 'build-modes',
    name: { en: 'Two build modes', 'pt-BR': 'Dois modos de build' },
    description: {
      en: 'One codebase builds a static site (local data, no backend) or a full-stack site (Rails API and PostgreSQL); the mode is chosen at build time.',
      'pt-BR':
        'Um único código gera um site estático (dados locais, sem back-end) ou um site full-stack (API em Rails e PostgreSQL); o modo é escolhido no build.',
    },
    status: 'done',
  },
  {
    id: 'internationalisation',
    name: { en: 'Internationalisation', 'pt-BR': 'Internacionalização' },
    description: {
      en: 'English and Brazilian Portuguese, each with its own URLs (/pt-br). The language switcher keeps you on the same page.',
      'pt-BR':
        'Inglês e português do Brasil, cada um com suas próprias URLs (/pt-br). O seletor de idioma mantém você na mesma página.',
    },
    status: 'done',
  },
  {
    id: 'responsive-layout',
    name: { en: 'Responsive layout', 'pt-BR': 'Layout responsivo' },
    description: {
      en: 'From 320px phones to ultrawide screens: a fluid container and card grids that adapt to the space they have.',
      'pt-BR':
        'De celulares de 320px a telas ultrawide: um container fluido e grades de cards que se adaptam ao espaço disponível.',
    },
    status: 'done',
  },
  {
    id: 'accessibility',
    name: { en: 'Accessibility', 'pt-BR': 'Acessibilidade' },
    description: {
      en: 'Built to WCAG 2.2 AA: landmarks, a skip link, keyboard navigation with visible focus, reduced motion and high-contrast support.',
      'pt-BR':
        'Feito seguindo a WCAG 2.2 AA: landmarks, link para pular ao conteúdo, navegação por teclado com foco visível, suporte a movimento reduzido e alto contraste.',
    },
    status: 'done',
  },
  {
    id: 'mascot',
    name: { en: 'Mascot guide', 'pt-BR': 'Mascote guia' },
    description: {
      en: 'The Home and Fun Fact mascot uses the final illustrations; the walking navigation mascot still uses placeholder art until its final frames are ready.',
      'pt-BR':
        'O mascote da página inicial e da Curiosidade usa as ilustrações finais; o mascote que caminha pela navegação ainda usa uma arte provisória até que seus quadros finais fiquem prontos.',
    },
    status: 'done',
  },
  {
    id: 'automated-testing',
    name: { en: 'Automated testing', 'pt-BR': 'Testes automatizados' },
    description: {
      en: 'Vitest and React Testing Library for components; Playwright with axe-core for end-to-end and accessibility checks, in both languages; RSpec, with FactoryBot and OpenAPI contract checks, for the Rails API.',
      'pt-BR':
        'Vitest e React Testing Library para os componentes; Playwright com axe-core para testes ponta a ponta e de acessibilidade, nos dois idiomas; RSpec, com FactoryBot e verificação do contrato OpenAPI, para a API em Rails.',
    },
    status: 'done',
  },
  {
    id: 'continuous-integration',
    name: { en: 'Continuous integration', 'pt-BR': 'Integração contínua' },
    description: {
      en: 'On every push and pull request, GitHub Actions checks formatting, lint, types, tests, content and the build, runs the end-to-end suite against both the full-stack and the static build, and runs the Rails API checks (style, security audits and RSpec against PostgreSQL).',
      'pt-BR':
        'A cada push e pull request, o GitHub Actions verifica formatação, lint, tipos, testes, conteúdo e o build, roda a suíte ponta a ponta tanto na versão full-stack quanto na versão estática, e roda as verificações da API em Rails (estilo, auditorias de segurança e RSpec com PostgreSQL).',
    },
    status: 'done',
  },
];

export interface Milestone {
  id: string;
  version: string;
  name: Localized<string>;
  status: Status;
}

/**
 * In delivery order (docs/ROADMAP.md). The MVP is complete only with the integration (v3);
 * the static site's release comes after it; the order of v5–v8 is provisional (the page says so).
 */
export const timeline: readonly Milestone[] = [
  {
    id: 'frontend-foundation',
    version: 'v1',
    name: { en: 'React frontend foundation', 'pt-BR': 'Fundação do front-end em React' },
    status: 'done',
  },
  {
    // Done: Phase 2 accepted (5f9eb59, docs/ROADMAP.md).
    id: 'rails-api',
    version: 'v2',
    name: { en: 'Rails API + PostgreSQL + RSpec', 'pt-BR': 'API em Rails + PostgreSQL + RSpec' },
    status: 'done',
  },
  {
    id: 'integration',
    version: 'v3',
    name: {
      en: 'Frontend/backend integration (MVP)',
      'pt-BR': 'Integração entre front-end e back-end (MVP)',
    },
    // Done: Phase 3 implemented and validated (Steps 3.0–3.5). Milestones describe the project,
    // so this is the same in both builds; the timeline note says whether this build uses the
    // API (ADR-0014). Done only while some section is Rails-backed in a full-stack build
    // (architecture.test.ts).
    status: 'done',
  },
  {
    // In progress: Phase 4 (ADR-0016). Done once the static site is published (Step 4.12).
    id: 'deployment',
    version: 'v4',
    name: { en: 'Static site release', 'pt-BR': 'Publicação do site estático' },
    status: 'in-progress',
  },
  {
    id: 'vue-microfrontend',
    version: 'v5',
    name: { en: 'Vue microfrontend', 'pt-BR': 'Microfrontend em Vue' },
    status: 'planned',
  },
  {
    id: 'fastapi-service',
    version: 'v6',
    name: { en: 'Python FastAPI', 'pt-BR': 'Python FastAPI' },
    status: 'planned',
  },
  {
    id: 'background-jobs',
    version: 'v7',
    name: { en: 'Background processing', 'pt-BR': 'Processamento em segundo plano' },
    status: 'planned',
  },
  {
    id: 'ai-lab',
    version: 'v8',
    name: { en: 'AI engineering experiments', 'pt-BR': 'Experimentos de engenharia de IA' },
    status: 'planned',
  },
];

export interface Decision {
  id: string;
  title: Localized<string>;
  summary: Localized<string>;
}

/** Accepted Architecture Decision Records (docs/adr), in order. */
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
  {
    id: 'ADR-0005',
    title: {
      en: 'Decorative mascot driven by a state machine',
      'pt-BR': 'Mascote decorativo guiado por uma máquina de estados',
    },
    summary: {
      en: 'Two decorative mascots animated by a small state machine and CSS; they never block content and respect reduced motion.',
      'pt-BR':
        'Dois mascotes decorativos animados por uma pequena máquina de estados e CSS; nunca bloqueiam o conteúdo e respeitam o movimento reduzido.',
    },
  },
  {
    id: 'ADR-0006',
    title: { en: 'Responsive layout strategy', 'pt-BR': 'Estratégia de layout responsivo' },
    summary: {
      en: 'A fluid container up to 1536px and card grids sized by their own space: wider screens get more columns, not longer lines.',
      'pt-BR':
        'Um container fluido de até 1536px e grades de cards dimensionadas pelo próprio espaço: telas maiores ganham mais colunas, não linhas mais longas.',
    },
  },
  {
    id: 'ADR-0007',
    title: {
      en: 'Internationalisation with language URLs',
      'pt-BR': 'Internacionalização com URLs por idioma',
    },
    summary: {
      en: 'English and Brazilian Portuguese with the language in the URL and typed translations, without an i18n library.',
      'pt-BR':
        'Inglês e português do Brasil com o idioma na URL e traduções tipadas, sem biblioteca de i18n.',
    },
  },
  {
    id: 'ADR-0008',
    title: {
      en: 'Page transitions with View Transitions',
      'pt-BR': 'Transições de página com View Transitions',
    },
    summary: {
      en: 'React Router crossfades the page between header and footer; instant with reduced motion or in older browsers.',
      'pt-BR':
        'O React Router faz um fade suave da página entre o cabeçalho e o rodapé; instantâneo com movimento reduzido ou em navegadores mais antigos.',
    },
  },
  {
    id: 'ADR-0009',
    title: {
      en: 'End-to-end testing with Playwright and axe',
      'pt-BR': 'Testes ponta a ponta com Playwright e axe',
    },
    summary: {
      en: 'The production build is tested in both languages, on desktop and mobile, including automated accessibility scans.',
      'pt-BR':
        'O build de produção é testado nos dois idiomas, no desktop e no celular, incluindo verificações automáticas de acessibilidade.',
    },
  },
  {
    id: 'ADR-0010',
    title: {
      en: 'Continuous integration with GitHub Actions',
      'pt-BR': 'Integração contínua com GitHub Actions',
    },
    summary: {
      en: 'Every push and pull request runs all checks; deployment waits until the backend is integrated.',
      'pt-BR':
        'Cada push e pull request executa todas as verificações; o deploy espera a integração com o back-end.',
    },
  },
  {
    id: 'ADR-0011',
    title: { en: 'Rails API-only backend', 'pt-BR': 'Back-end em Rails somente API' },
    summary: {
      en: 'A Ruby on Rails API with PostgreSQL in its own service, same-origin with the shell and tested on its own.',
      'pt-BR':
        'Uma API em Ruby on Rails com PostgreSQL em um serviço próprio, na mesma origem que o shell e testada de forma independente.',
    },
  },
  {
    id: 'ADR-0012',
    title: {
      en: 'Localised data and an OpenAPI contract',
      'pt-BR': 'Dados localizados e contrato OpenAPI',
    },
    summary: {
      en: 'Bilingual text stored as JSON and a versioned REST API described by an OpenAPI document that both sides test against.',
      'pt-BR':
        'Textos bilíngues armazenados como JSON e uma API REST versionada, descrita por um documento OpenAPI que os dois lados usam nos testes.',
    },
  },
  {
    id: 'ADR-0013',
    title: {
      en: 'Contact messages: privacy and abuse protection',
      'pt-BR': 'Mensagens de contato: privacidade e proteção contra abuso',
    },
    summary: {
      en: 'Minimal personal data, no IP addresses, filtered logs, rate limits and a honeypot, with a 12-month retention.',
      'pt-BR':
        'Dados pessoais mínimos, sem endereços IP, logs filtrados, limites de envio e um honeypot, com retenção de 12 meses.',
    },
  },
  {
    id: 'ADR-0014',
    title: {
      en: 'Frontend data access: static and full-stack modes',
      'pt-BR': 'Acesso a dados no front-end: modos estático e full-stack',
    },
    summary: {
      en: 'One codebase builds a full-stack site (Rails API and PostgreSQL) or a static one (local data, no backend); the mode is chosen at build time, and API failures are shown, never hidden.',
      'pt-BR':
        'Um único código gera um site full-stack (API em Rails e PostgreSQL) ou um estático (dados locais, sem back-end); o modo é escolhido no build, e falhas da API são mostradas, nunca escondidas.',
    },
  },
  {
    id: 'ADR-0015',
    title: {
      en: 'Deployment in two stages',
      'pt-BR': 'Deploy em duas etapas',
    },
    summary: {
      en: 'Superseded by ADR-0016: the full stack on one origin for a limited period, then the static site on free hosting.',
      'pt-BR':
        'Substituída pela ADR-0016: a versão full-stack em uma única origem por um período limitado e, depois, o site estático em hospedagem gratuita.',
    },
  },
  {
    // A decision, not a deployment: the timeline's v4 is done only once the site is published.
    id: 'ADR-0016',
    title: {
      en: 'Static-first deployment',
      'pt-BR': 'Deploy priorizando o site estático',
    },
    summary: {
      en: 'The public site is the static build on free static hosting; the Rails API and PostgreSQL stay fully built and tested and run locally, avoiding a recurring server cost.',
      'pt-BR':
        'O site público é a versão estática, em hospedagem estática gratuita; a API em Rails e o PostgreSQL continuam completos e testados e rodam localmente, evitando um custo recorrente de servidor.',
    },
  },
];

export interface RunMode {
  id: AppMode;
  name: Localized<string>;
  /** What this mode is for, shown under its name. */
  role: Localized<string>;
  points: readonly Localized<string>[];
  /** Where this mode is hosted, and whether that exists yet. The full stack is never hosted. */
  hosting?: { name: Text; status: Status };
  note?: Localized<string>;
}

/** "Two ways to run it": the static production build and the local full-stack mode (ADR-0016). */
export const runModes: readonly RunMode[] = [
  {
    id: 'static',
    name: { en: 'Static site', 'pt-BR': 'Site estático' },
    role: { en: 'The production build', 'pt-BR': 'A versão de produção' },
    points: [
      {
        en: 'The React shell with typed local data, in English and Portuguese.',
        'pt-BR': 'O shell em React com dados locais tipados, em inglês e português.',
      },
      {
        en: 'No API, no database and no server: plain files, with security headers and a strict Content Security Policy prepared for the host.',
        'pt-BR':
          'Sem API, sem banco de dados e sem servidor: arquivos simples, com cabeçalhos de segurança e uma Content Security Policy rígida já preparados para a hospedagem.',
      },
      {
        en: 'The Contact page links to email, LinkedIn and GitHub.',
        'pt-BR': 'A página de Contato indica e-mail, LinkedIn e GitHub.',
      },
    ],
    // Planned until the site is published (Step 4.12).
    hosting: { name: 'Cloudflare Pages', status: 'planned' },
  },
  {
    id: 'fullstack',
    name: { en: 'Full-stack mode', 'pt-BR': 'Modo full-stack' },
    role: { en: 'Runs locally', 'pt-BR': 'Executado localmente' },
    points: [
      {
        en: 'Projects served by a Ruby on Rails 8 API from PostgreSQL 18, through an OpenAPI contract.',
        'pt-BR':
          'Projetos servidos por uma API em Ruby on Rails 8 a partir do PostgreSQL 18, por meio de um contrato OpenAPI.',
      },
      {
        en: 'A contact form validated and stored in PostgreSQL, with rate limits and a honeypot.',
        'pt-BR':
          'Um formulário de contato validado e armazenado no PostgreSQL, com limites de envio e um honeypot.',
      },
      {
        en: 'A production Docker image in which Rails serves the site and the API from one origin, built and smoke-tested in CI.',
        'pt-BR':
          'Uma imagem Docker de produção em que o Rails serve o site e a API em uma única origem, construída e testada no CI.',
      },
    ],
    note: {
      en: 'Not deployed: kept as a complete, tested demonstration, so the portfolio has no recurring server cost.',
      'pt-BR':
        'Sem deploy: mantido como uma demonstração completa e testada, para que o portfólio não tenha custo recorrente de servidor.',
    },
  },
];
