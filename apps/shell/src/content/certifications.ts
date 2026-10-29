// Source of truth: the owner's certificates (the FullStack certificate PDF, held by the owner).
// Credential IDs stay off the page, and no verification URL is shown unless one is public.

import type { Text } from '../i18n/localized.ts';
import type { Locale } from '../i18n/locales.ts';
import { formatYearMonth } from './experience.ts';

export interface Certification {
  /** Official titles stay in their original language. */
  title: Text;
  issuer: Text;
  /** "YYYY-MM", or "YYYY" when only the year is known. */
  issued: string;
  /** "YYYY-MM": shown as "Valid until …" when the credential expires. */
  expires?: string;
}

export const certifications: readonly Certification[] = [
  {
    title: 'FullStack Certification in Agentic Ruby on Rails Development',
    issuer: 'FullStack',
    issued: '2026-10',
    expires: '2027-10',
  },
];

/** "2026-10" → "Oct 2026" / "out. 2026"; a bare year stays as it is. */
export function formatIssued(value: string, locale: Locale = 'en'): string {
  return /^\d{4}$/.test(value) ? value : formatYearMonth(value, locale);
}
