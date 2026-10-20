// Source of truth: Bruno's résumé. Dates are "YYYY-MM"; only public wording, no client names.

import type { Localized, Text } from '../i18n/localized.ts';
import type { Locale } from '../i18n/locales.ts';

export interface Experience {
  role: Localized<string>;
  company: Text;
  start: string;
  end: string;
  summary: Localized<string>;
}

/** Most recent first. */
export const experience: readonly Experience[] = [
  {
    role: { en: 'Software Developer', 'pt-BR': 'Desenvolvedor de Software' },
    company: 'Vortigo Digital',
    start: '2025-06',
    end: '2026-08',
    summary: {
      en: 'Full-stack work on a large-scale healthcare platform with Ruby on Rails and Vue.js: new features, production troubleshooting, Elasticsearch and Searchkick search, Sidekiq background jobs and RSpec tests, deployed through AWS-based CI/CD workflows.',
      'pt-BR':
        'Desenvolvimento full-stack em uma plataforma de saúde de grande porte com Ruby on Rails e Vue.js: novas funcionalidades, resolução de problemas em produção, busca com Elasticsearch e Searchkick, jobs em segundo plano com Sidekiq e testes com RSpec, com deploy por meio de pipelines de CI/CD na AWS.',
    },
  },
  {
    role: { en: 'Software Developer', 'pt-BR': 'Desenvolvedor de Software' },
    company: 'Rebase',
    start: '2023-09',
    end: '2025-05',
    summary: {
      en: 'Features and bug fixes with Ruby on Rails and React, in collaboration with client engineering teams, using REST APIs, PostgreSQL and Docker, with RSpec tests and code reviews.',
      'pt-BR':
        'Desenvolvimento de funcionalidades e correção de bugs com Ruby on Rails e React, em colaboração com as equipes de engenharia dos clientes, usando APIs REST, PostgreSQL e Docker, com testes em RSpec e revisões de código.',
    },
  },
  {
    role: { en: 'Frontend Web Developer', 'pt-BR': 'Desenvolvedor Web Front-end' },
    company: { en: 'Freelance', 'pt-BR': 'Freelancer' },
    start: '2023-01',
    end: '2023-09',
    summary: {
      en: 'Responsive websites and landing pages for small businesses and independent clients, built with HTML, CSS, JavaScript and Bootstrap.',
      'pt-BR':
        'Sites responsivos e landing pages para pequenas empresas e clientes independentes, desenvolvidos com HTML, CSS, JavaScript e Bootstrap.',
    },
  },
];

const monthYear: Readonly<Record<Locale, Intl.DateTimeFormat>> = {
  en: new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
  'pt-BR': new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' }),
};

/** "2025-06" → "Jun 2025" (en) or "jun. 2025" (pt-BR). */
export function formatYearMonth(yearMonth: string, locale: Locale = 'en'): string {
  const date = new Date(`${yearMonth}-01T00:00:00Z`);
  if (locale === 'en') return monthYear.en.format(date);
  // Intl gives "jun. de 2025" in Portuguese; the short form reads better in a date range.
  return `${monthYear[locale].format(date)} ${date.getUTCFullYear()}`;
}
