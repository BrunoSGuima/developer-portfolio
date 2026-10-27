/**
 * The contact form's model (full-stack mode, ADR-0014): what the form sends and what its route
 * action answers. It depends only on the shell, never on the API's types, so the form can render
 * every outcome without seeing the API layer. Results carry codes, never submitted values or
 * text, so they render in whichever language the page is in.
 */

export const CONTACT_FIELDS = ['name', 'email', 'message'] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];

export type ContactValues = Record<ContactField, string>;

/** The API's validation codes for these fields (ADR-0012), which the client checks mirror. */
export type FieldErrorCode = 'blank' | 'too_short' | 'too_long' | 'invalid';

export type FieldErrors = Partial<Record<ContactField, FieldErrorCode>>;

export type ContactResult =
  | { status: 'sent' }
  | { status: 'invalid'; errors: FieldErrors }
  /** Seconds until the API accepts messages again (Retry-After), when it says so. */
  | { status: 'rate_limited'; retryAfter: number | null }
  /** The request may or may not have reached the API: the message may have been received. */
  | { status: 'network' }
  /** The API answered, but with something other than acceptance or a known field error. */
  | { status: 'unavailable' };

export const emptyContactValues: ContactValues = { name: '', email: '', message: '' };
