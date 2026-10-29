/**
 * Delivery status shown on projects and architecture items, always rendered as words. `live`
 * marks what runs on the published static site; `done` marks finished work (milestones, and
 * components that don't run on the site).
 */
export type Status = 'done' | 'live' | 'in-progress' | 'planned';
