import type { Project } from '../projects/model.ts';

// Only public work belongs here: professional work in private client codebases is not a
// portfolio project.
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
    // The repository hasn't been pushed yet, so this points to the GitHub profile for now.
    links: [
      {
        label: { en: 'GitHub profile', 'pt-BR': 'Perfil no GitHub' },
        href: 'https://github.com/BrunoSGuima',
      },
    ],
  },
];
