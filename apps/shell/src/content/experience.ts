// Source of truth: Bruno's résumé. Dates are "YYYY-MM"; only public wording, no client names.

export interface Experience {
  role: string;
  company: string;
  start: string;
  end: string;
  summary: string;
}

/** Most recent first. */
export const experience: readonly Experience[] = [
  {
    role: 'Software Developer',
    company: 'Vortigo Digital',
    start: '2025-06',
    end: '2026-08',
    summary:
      'Full-stack work on a large-scale healthcare platform with Ruby on Rails and Vue.js: new features, production troubleshooting, Elasticsearch and Searchkick search, Sidekiq background jobs and RSpec tests, deployed through AWS-based CI/CD workflows.',
  },
  {
    role: 'Software Developer',
    company: 'Rebase',
    start: '2023-09',
    end: '2025-05',
    summary:
      'Features and bug fixes with Ruby on Rails and React, in collaboration with client engineering teams, using REST APIs, PostgreSQL and Docker, with RSpec tests and code reviews.',
  },
  {
    role: 'Frontend Web Developer',
    company: 'Freelance',
    start: '2023-01',
    end: '2023-09',
    summary:
      'Responsive websites and landing pages for small businesses and independent clients, built with HTML, CSS, JavaScript and Bootstrap.',
  },
];

const monthYear = new Intl.DateTimeFormat('en', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "2025-06" → "Jun 2025". */
export function formatYearMonth(yearMonth: string): string {
  return monthYear.format(new Date(`${yearMonth}-01T00:00:00Z`));
}
