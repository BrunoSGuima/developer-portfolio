import { describe, expect, it } from 'vitest';
import tokens from './tokens.css?raw';

describe('layout tokens', () => {
  it('grows the container with the screen: 72rem up to 1280px, at most 96rem', () => {
    expect(tokens).toMatch(/--content-max:\s*clamp\(72rem, 100vw - 8rem, 96rem\);/);
  });

  it('gives every page intro the same, wider reading measure', () => {
    expect(tokens).toMatch(/--measure:\s*65ch;/);
    expect(tokens).toMatch(/--measure-lead:\s*75ch;/);
  });

  it('caps the Home stage and hero column at their tuned 72rem-container sizes', () => {
    // 56% and 44% of 1152px (minus 1rem for the text): the mascot, card and line breaks stay
    // exactly as tuned on wider containers.
    expect(tokens).toMatch(/--home-stage-max:\s*40\.32rem;/);
    expect(tokens).toMatch(/--home-hero-text-max:\s*30\.68rem;/);
    expect(tokens).toMatch(/--home-stage-nudge:\s*2\.5rem;/);
  });
});
