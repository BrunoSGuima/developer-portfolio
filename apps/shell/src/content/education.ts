// Source of truth: Bruno's résumé.

import type { Localized, Text } from '../i18n/localized.ts';
import type { Locale } from '../i18n/locales.ts';

export interface Education {
  /** Official course names stay in their original language. */
  title: Text;
  institution: Text;
  start: number;
  /** `null` while still in progress. */
  end: number | null;
  note?: Localized<string>;
}

export const education: readonly Education[] = [
  {
    title: "CS50's Introduction to Artificial Intelligence with Python",
    institution: 'Harvard (CS50AI)',
    start: 2026,
    end: null,
  },
  {
    title: {
      en: 'Technology Degree in Systems Analysis and Development',
      'pt-BR': 'Tecnólogo em Análise e Desenvolvimento de Sistemas',
    },
    institution: 'FIAP',
    start: 2022,
    end: 2023,
  },
  {
    title: {
      en: 'Immersive Web Development Training',
      'pt-BR': 'Treinamento imersivo em desenvolvimento web',
    },
    institution: {
      en: 'Campus Code TreinaDev Program',
      'pt-BR': 'Programa TreinaDev da Campus Code',
    },
    start: 2023,
    end: 2023,
    note: {
      en: 'Selected as one of about 25 participants from about 5,000 applicants.',
      'pt-BR': 'Selecionado entre cerca de 25 participantes, de aproximadamente 5.000 inscritos.',
    },
  },
  {
    title: { en: "Bachelor's Degree in Law", 'pt-BR': 'Bacharelado em Direito' },
    institution: 'Universidade Católica do Salvador (UCSAL)',
    start: 2008,
    end: 2013,
  },
];

const IN_PROGRESS: Readonly<Record<Locale, string>> = {
  en: 'in progress',
  'pt-BR': 'em andamento',
};

export function formatPeriod(
  { start, end }: Pick<Education, 'start' | 'end'>,
  locale: Locale = 'en',
): string {
  if (end === null) return `${start}, ${IN_PROGRESS[locale]}`;
  if (end === start) return `${start}`;
  return `${start} – ${end}`;
}
