/**
 * Content that still needs the owner's confirmation is written as `todo('…')` instead of a
 * string. It renders as a visible "To confirm" chip (never as a link), and `listPlaceholders()`
 * collects every pending item so a deploy can be blocked while any remain (Step 10).
 */

export interface Placeholder {
  readonly todo: string;
}

/** A piece of copy: either confirmed text or a placeholder. */
export type Content = string | Placeholder;

export function todo(description: string): Placeholder {
  return { todo: description };
}

export function isPlaceholder(value: unknown): value is Placeholder {
  return typeof value === 'object' && value !== null && 'todo' in value;
}

/** Recursively collects the descriptions of all placeholders inside `value`. */
export function listPlaceholders(value: unknown): string[] {
  if (isPlaceholder(value)) return [value.todo];
  if (Array.isArray(value)) return value.flatMap(listPlaceholders);
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap(listPlaceholders);
  }
  return [];
}
