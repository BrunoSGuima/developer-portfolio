/**
 * The build's mode (ADR-0014), the single source of truth for it: set by VITE_APP_MODE at build
 * time and validated in vite.config.ts.
 *
 * - 'static' (the default): the shell uses its local data and never contacts an API, so the
 *   site works as plain files with no Rails or PostgreSQL.
 * - 'fullstack': the shell uses the Rails API (same-origin /api) for its data.
 *
 * `isFullStack` is a literal comparison that Vite replaces at build time, so a static build
 * drops every full-stack-only branch, including the API client.
 */
export type AppMode = 'static' | 'fullstack';

export const APP_MODES: readonly AppMode[] = ['static', 'fullstack'];

export const isFullStack = import.meta.env.VITE_APP_MODE === 'fullstack';

export const appMode: AppMode = isFullStack ? 'fullstack' : 'static';
