import type { Project } from '../projects/model.ts';

// Personal projects only: professional work in private client codebases is not a portfolio
// project. A project in a private repository has no link (nothing may point to it).
//
// This is the static data source (static mode, ADR-0014): kept permanently, so the site works
// without the Rails API. Full-stack mode reads the same projects from the API, whose seeds
// (services/api/db/seeds.rb) must stay equivalent; update both together.

export const projects: readonly Project[] = [
  {
    id: 'developer-portfolio',
    name: {
      en: 'Developer Portfolio (this site)',
      'pt-BR': 'Portfólio de Desenvolvedor (este site)',
    },
    status: 'in-progress',
    description: {
      en: 'An interactive portfolio built as a set of independent applications: a React and TypeScript shell with client-side routing, accessibility-first components and a Fun Fact that describes the real stack behind each page, and a Ruby on Rails API with PostgreSQL. Next up: a Vue.js microfrontend and a Python service.',
      'pt-BR':
        'Um portfólio interativo construído como um conjunto de aplicações independentes: um shell em React e TypeScript com roteamento no navegador, componentes pensados para acessibilidade e uma Curiosidade que descreve a tecnologia real por trás de cada página, e uma API em Ruby on Rails com PostgreSQL. Próximos passos: um microfrontend em Vue.js e um serviço em Python.',
    },
    tech: ['react', 'typescript', 'vite', 'react-router', 'rails'],
    links: [
      {
        label: { en: 'Source code', 'pt-BR': 'Código-fonte' },
        href: 'https://github.com/BrunoSGuima/developer-portfolio',
      },
    ],
  },
  {
    // The repository is private: no link (nothing may point to it).
    id: 'personal-finance-app',
    name: { en: 'Personal Finance App', 'pt-BR': 'App de Finanças Pessoais' },
    status: 'in-progress',
    description: {
      en: 'A personal finance mobile app built with Flutter and Dart, in development: it already lets you create, view, edit and delete financial records. I build it with a multi-agent AI workflow: Grok Bot and Cursor coordinate agents for development, design and QA, while I plan, supervise, review the code and validate the results.',
      'pt-BR':
        'Um app mobile de finanças pessoais feito com Flutter e Dart, em desenvolvimento: ele já permite criar, visualizar, editar e excluir registros financeiros. Eu o desenvolvo com um fluxo multiagente de IA: o Grok Bot e o Cursor coordenam agentes de desenvolvimento, design e QA, enquanto eu planejo, supervisiono, reviso o código e valido os resultados.',
    },
    tech: ['flutter', 'dart'],
    links: [],
  },
  {
    id: 'auction-house',
    name: { en: 'Auction House', 'pt-BR': 'Casa de Leilões' },
    status: 'done',
    description: {
      en: 'A Ruby on Rails auction platform built during the Campus Code TreinaDev program: users bid on product lots, follow the bids, favourite lots and ask questions; administrators manage products and categories, approve and close lots, and block accounts by CPF. Authentication with Devise; tested with RSpec and Capybara system specs.',
      'pt-BR':
        'Uma plataforma de leilões em Ruby on Rails desenvolvida durante o programa TreinaDev da Campus Code: usuários dão lances em lotes de produtos, acompanham os lances, favoritam lotes e enviam perguntas; administradores gerenciam produtos e categorias, aprovam e encerram lotes e bloqueiam contas por CPF. Autenticação com Devise; testes com RSpec e testes de sistema com Capybara.',
    },
    tech: ['rails', 'rspec', 'bootstrap'],
    links: [
      {
        label: { en: 'Source code', 'pt-BR': 'Código-fonte' },
        href: 'https://github.com/BrunoSGuima/auction-house',
      },
    ],
  },
];
