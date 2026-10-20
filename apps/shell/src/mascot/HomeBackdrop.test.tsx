import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomeBackdrop from './HomeBackdrop.tsx';

describe('HomeBackdrop', () => {
  it('uses A2 on small screens and A1 otherwise, never stretched', () => {
    const { container } = render(<HomeBackdrop />);
    const source = container.querySelector('picture source')!;
    const img = container.querySelector('picture img')!;

    expect(source).toHaveAttribute('media', '(max-width: 47.99rem)');
    expect(source.getAttribute('srcset')).toMatch(/heroMobile-\d+\.webp/);
    expect(img.getAttribute('srcset')).toMatch(/heroDesktop-\d+\.webp/);
    expect(img).toHaveAttribute('data-illustration', 'heroDesktop');
  });

  it('is decorative, with dimensions, loaded with high priority', () => {
    const { container } = render(<HomeBackdrop />);
    const backdrop = container.firstElementChild!;
    const img = container.querySelector('img')!;

    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    expect(img).toHaveAttribute('alt', '');
    expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
    expect(img).toHaveAttribute('fetchpriority', 'high');
  });

  it('includes the readability scrim over the artwork', () => {
    const { container } = render(<HomeBackdrop />);

    expect(container.querySelector('[data-slot="scrim"]')).not.toBeNull();
  });
});
