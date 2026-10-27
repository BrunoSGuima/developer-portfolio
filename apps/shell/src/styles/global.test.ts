import { describe, expect, it } from 'vitest';
import global from './global.css?raw';

/** The body of the first `@media (prefers-reduced-motion: reduce)` block. */
function reducedMotionBlock(css: string): string {
  const start = css.indexOf('@media (prefers-reduced-motion: reduce)');
  const end = css.indexOf('\n}\n', start);
  return start === -1 ? '' : css.slice(start, end);
}

describe('reduced motion (global.css)', () => {
  const block = reducedMotionBlock(global);

  it('exists', () => {
    expect(block).not.toBe('');
  });

  // A non-zero duration would make every style change a transition (transition-property
  // defaults to `all`), painted late: the Home layout jump fixed in Step 4.0.
  it('turns transitions off (0s), never a non-zero global duration or delay', () => {
    expect(block).toMatch(/transition-duration:\s*0s !important;/);
    expect(block).toMatch(/transition-delay:\s*0s !important;/);
    expect(block).not.toMatch(/transition-(duration|delay):\s*(?!0s\b)[0-9.]+m?s/);
  });

  it('still shortens animations to a single, instant run', () => {
    expect(block).toMatch(/animation-duration:\s*0\.01ms !important;/);
    expect(block).toMatch(/animation-iteration-count:\s*1 !important;/);
  });
});
