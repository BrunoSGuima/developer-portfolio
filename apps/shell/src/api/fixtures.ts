import type { ApiProject, ApiProjectList } from './types.ts';

/**
 * API responses for tests, checked against the generated contract types (`satisfies`), so the
 * shell's test data can't drift from services/api/docs/openapi.yaml.
 */
export const projectResponse = {
  slug: 'developer-portfolio',
  name: {
    en: 'Developer Portfolio (this site)',
    'pt-BR': 'Portfólio de Desenvolvedor (este site)',
  },
  description: { en: 'An interactive portfolio.', 'pt-BR': 'Um portfólio interativo.' },
  status: 'in-progress',
  technologies: ['react', 'typescript', 'vite', 'react-router'],
  links: [
    {
      label: { en: 'GitHub profile', 'pt-BR': 'Perfil no GitHub' },
      url: 'https://github.com/BrunoSGuima',
    },
    {
      label: { en: 'Source code', 'pt-BR': 'Código-fonte' },
      url: 'https://example.com/source',
    },
  ],
} satisfies ApiProject;

export const projectListResponse = { data: [projectResponse] } satisfies ApiProjectList;

export const errorResponse = (
  code: string,
  message: string,
  details: Record<string, unknown> = {},
) => ({
  error: { code, message, details },
});
