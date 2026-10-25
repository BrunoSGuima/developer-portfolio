/**
 * Delivery status shown on projects and architecture items, always rendered as words. `done`
 * marks a finished milestone (not "live": the site isn't deployed yet).
 */
export type Status = 'done' | 'live' | 'in-progress' | 'planned';
