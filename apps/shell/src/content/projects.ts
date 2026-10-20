import type { Localized } from '../i18n/localized.ts';
import type { TechId } from '../sections/technologies.ts';
import type { Content } from './placeholder.ts';
import type { Status } from './status.ts';

// Only public work belongs here: professional work in private client codebases is not a
// portfolio project.

export interface ProjectLink {
  label: Localized<string>;
  href: Content;
}

export interface Project {
  id: string;
  name: Localized<string>;
  status: Status;
  description: Localized<string>;
  tech: readonly TechId[];
  links: readonly ProjectLink[];
}

export const projects: readonly Project[] = [
  {
    id: 'developer-portfolio',
    name: {
      en: 'Developer Portfolio (this site)',
      'pt-BR': 'Portfólio de Desenvolvedor (este site)',
    },
    status: 'in-progress',
    description: {
      en: "An interactive portfolio built as a set of independent applications. Today it's a React and TypeScript shell with a section registry, client-side routing, accessibility-first components and a Fun Fact that describes the real stack behind each page. Next up: a Ruby on Rails API, a Vue.js microfrontend and a Python service.",
      'pt-BR':
        'Um portfólio interativo construído como um conjunto de aplicações independentes. Hoje ele é um shell em React e TypeScript com registro de seções, roteamento no navegador, componentes pensados para acessibilidade e uma Curiosidade que descreve a tecnologia real por trás de cada página. Próximos passos: uma API em Ruby on Rails, um microfrontend em Vue.js e um serviço em Python.',
    },
    tech: ['react', 'typescript', 'vite', 'react-router'],
    // The repository hasn't been pushed yet, so this points to the GitHub profile for now.
    links: [
      {
        label: { en: 'GitHub profile', 'pt-BR': 'Perfil no GitHub' },
        href: 'https://github.com/BrunoSGuima',
      },
    ],
  },
];
