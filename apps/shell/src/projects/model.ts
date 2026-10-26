import type { Content } from '../content/placeholder.ts';
import type { Status } from '../content/status.ts';
import type { Localized } from '../i18n/localized.ts';
import type { TechId } from '../sections/technologies.ts';

/**
 * The project view model: what pages and ProjectCard render, whatever the data source (ADR-0014).
 * The static data (content/projects.ts, static mode) and the API mapping (api/projects.ts,
 * full-stack mode) both produce it, so it depends on neither: only on the shell's own concepts.
 */
export interface ProjectLink {
  label: Localized<string>;
  /** A URL. Static data may hold a `todo()` placeholder, which the content gate forbids in CI. */
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
