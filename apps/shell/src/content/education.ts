// Source of truth: Bruno's résumé.

export interface Education {
  title: string;
  institution: string;
  start: number;
  /** `null` while still in progress. */
  end: number | null;
  note?: string;
}

export const education: readonly Education[] = [
  {
    title: "CS50's Introduction to Artificial Intelligence with Python",
    institution: 'Harvard (CS50AI)',
    start: 2026,
    end: null,
  },
  {
    title: 'Technology Degree in Systems Analysis and Development',
    institution: 'FIAP',
    start: 2022,
    end: 2023,
  },
  {
    title: 'Immersive Web Development Training',
    institution: 'Campus Code TreinaDev Program',
    start: 2023,
    end: 2023,
    note: 'Selected as one of about 25 participants from about 5,000 applicants.',
  },
  {
    title: "Bachelor's Degree in Law",
    institution: 'Universidade Católica do Salvador (UCSAL)',
    start: 2008,
    end: 2013,
  },
];

export function formatPeriod({ start, end }: Pick<Education, 'start' | 'end'>): string {
  if (end === null) return `${start}, in progress`;
  if (end === start) return `${start}`;
  return `${start} – ${end}`;
}
