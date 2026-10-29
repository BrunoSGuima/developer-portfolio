/**
 * Technologies that can appear as Fun Fact badges. Add an entry only when a section references
 * it; `TechId` is derived from the keys, so a misspelled badge is a compile error.
 */

export type BadgeTone = 'blue' | 'slate' | 'green' | 'burgundy';

export interface Technology {
  label: string;
  tone: BadgeTone;
}

export const technologies = {
  react: { label: 'React', tone: 'blue' },
  typescript: { label: 'TypeScript', tone: 'slate' },
  vite: { label: 'Vite', tone: 'slate' },
  'react-router': { label: 'React Router', tone: 'slate' },
  vue: { label: 'Vue.js', tone: 'green' },
  rails: { label: 'Ruby on Rails', tone: 'burgundy' },
  postgresql: { label: 'PostgreSQL', tone: 'blue' },
  flutter: { label: 'Flutter', tone: 'blue' },
  dart: { label: 'Dart', tone: 'slate' },
  rspec: { label: 'RSpec', tone: 'burgundy' },
  bootstrap: { label: 'Bootstrap', tone: 'slate' },
} as const satisfies Record<string, Technology>;

export type TechId = keyof typeof technologies;
