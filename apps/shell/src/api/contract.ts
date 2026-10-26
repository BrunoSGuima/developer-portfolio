import type { Status } from '../content/status.ts';
import type { Locale } from '../i18n/locales.ts';
import type { TechId } from '../sections/technologies.ts';
import type { ApiLocale, ApiStatus, ApiTechnology } from './types.ts';

/**
 * Compile-time parity between the API contract and the shell (ADR-0012, ADR-0014). Types only:
 * nothing reaches the bundle, and `npm run typecheck` / `build` fail when the contract and the
 * shell disagree (after `npm run api:types`).
 */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;

/** Every technology the API can return has a badge in the shell. */
export type TechnologiesHaveBadges = Assert<[ApiTechnology] extends [TechId] ? true : false>;
/** Both sides use exactly the same status words... */
export type SameStatusWords = Assert<Equals<ApiStatus, Status>>;
/** ...and exactly the same languages. */
export type SameLocales = Assert<Equals<ApiLocale, Locale>>;
