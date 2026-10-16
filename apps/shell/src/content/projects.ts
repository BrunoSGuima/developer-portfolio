import type { TechId } from '../sections/technologies.ts';
import type { Content } from './placeholder.ts';
import type { Status } from './status.ts';

// Only public work belongs here: professional work in private client codebases is not a
// portfolio project.

export interface ProjectLink {
  label: string;
  href: Content;
}

export interface Project {
  id: string;
  name: string;
  status: Status;
  description: string;
  tech: readonly TechId[];
  links: readonly ProjectLink[];
}

export const projects: readonly Project[] = [
  {
    id: 'developer-portfolio',
    name: 'Developer Portfolio (this site)',
    status: 'in-progress',
    description:
      "An interactive portfolio built as a set of independent applications. Today it's a React and TypeScript shell with a section registry, client-side routing, accessibility-first components and a Fun Fact that describes the real stack behind each page. Next up: a Ruby on Rails API, a Vue.js microfrontend and a Python service.",
    tech: ['react', 'typescript', 'vite', 'react-router'],
    // The repository hasn't been pushed yet, so this points to the GitHub profile for now.
    links: [{ label: 'GitHub profile', href: 'https://github.com/BrunoSGuima' }],
  },
];
