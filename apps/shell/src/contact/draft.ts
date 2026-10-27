import { type ContactValues, emptyContactValues } from './model.ts';

/**
 * What the visitor has typed, kept in memory so it survives a language switch (the Portuguese
 * route remounts the page) and leaving and coming back. Never written to Web Storage or sent
 * anywhere until submitted; a reload clears it. Cleared when a message is accepted.
 */
let draft: ContactValues = emptyContactValues;

export function getDraft(): ContactValues {
  return draft;
}

export function saveDraft(values: ContactValues): void {
  draft = values;
}

export function clearDraft(): void {
  draft = emptyContactValues;
}
