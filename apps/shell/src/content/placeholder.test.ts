import { describe, expect, it } from 'vitest';
import { allContent } from './index.ts';
import { isPlaceholder, listPlaceholders, todo } from './placeholder.ts';

describe('placeholders', () => {
  it('todo() creates a placeholder that is distinguishable from text', () => {
    expect(isPlaceholder(todo('your email'))).toBe(true);
    expect(isPlaceholder('your email')).toBe(false);
  });

  it('listPlaceholders() finds placeholders nested in objects and arrays', () => {
    const content = { a: 'text', b: [todo('one'), { c: todo('two') }], d: 3 };

    expect(listPlaceholders(content)).toEqual(['one', 'two']);
  });

  it('reports the placeholders still pending in the site content', () => {
    const pending = listPlaceholders(allContent);

    // Not a failure: Step 10 turns this into a deploy gate. Printed so it stays visible.
    const list = pending.length > 0 ? `\n- ${pending.join('\n- ')}` : ' none';
    console.info(`Pending content placeholders (${pending.length}):${list}`);
    expect(pending.every((description) => description.trim() !== '')).toBe(true);
  });
});
