/**
 * Matches phone-number-like text: an international prefix ("+" and digits), or 8+ digits that
 * may be separated by single spaces or hyphens. Deliberately generic, so no real number ever has
 * to be written into the repository.
 */
export const PHONE_PATTERN = /\+\d{1,3}[\s-]?\d|(?:\d[\s-]?){8,}/;
