import { describe, expect, it } from 'vitest';
import pageCss from './Page.module.css?raw';

// jsdom can't lay out grids, so these pin the rules; the behaviour (columns, maximum widths, no
// collapsed or overflowing tracks) was verified in Chromium at 320–2560px in Step 8.
describe('cardGridFit (container-sized card grid)', () => {
  // The last block for a selector (.cardGridFit also appears in the shared list rule above it).
  const rule = (selector: string) =>
    [
      ...pageCss.matchAll(
        new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`, 'g'),
      ),
    ].at(-1)?.[1] ?? '';

  it('uses auto-fill, so a short list keeps normal widths instead of stretching', () => {
    expect(rule('.cardGridFit')).toMatch(/repeat\(\s*auto-fill,/);
    expect(rule('.cardGridFit')).not.toMatch(/auto-fit/);
  });

  it('is tuned per list: minimum width, column cap and gap, with defaults', () => {
    const css = rule('.cardGridFit');
    expect(css).toMatch(/--_gap:\s*var\(--grid-gap, var\(--space-4\)\)/);
    expect(css).toMatch(/--_cols:\s*var\(--grid-cols, 2\)/);
    expect(css).toMatch(
      /max\(var\(--grid-min, 16rem\), \(100% - \(var\(--_cols\) - 1\) \* var\(--_gap\)\) \/ var\(--_cols\)\)/,
    );
  });

  it('caps each item at --grid-max', () => {
    expect(rule('.cardGridFit > *')).toMatch(/max-width:\s*var\(--grid-max, none\)/);
  });
});

describe('page intro (lead) width', () => {
  it('is shared by every page: the --measure-lead token, wider than body text', () => {
    expect(pageCss).toMatch(/\.lead\s*\{[^}]*max-width:\s*var\(--measure-lead\)/);
    expect(pageCss).not.toMatch(/leadWide/);
  });
});
