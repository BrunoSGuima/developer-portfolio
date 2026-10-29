import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { applyTheme } from '../theme/theme.ts';
import HomeBackdrop from './HomeBackdrop.tsx';
import css from './HomeBackdrop.module.css?raw';

const layers = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('picture[data-backdrop-theme]'),
];
const layer = (container: HTMLElement, theme: 'light' | 'dark') =>
  container.querySelector<HTMLElement>(`picture[data-backdrop-theme="${theme}"]`);
const active = (container: HTMLElement) =>
  layers(container).filter((picture) => picture.dataset.active === 'true');

describe('HomeBackdrop', () => {
  it('uses A2 on small screens and A1 otherwise, never stretched (light theme)', () => {
    applyTheme('light');
    const { container } = render(<HomeBackdrop />);
    const source = container.querySelector('picture source')!;
    const img = container.querySelector('picture img')!;

    expect(source).toHaveAttribute('media', '(max-width: 47.99rem)');
    expect(source.getAttribute('srcset')).toMatch(/heroMobile-\d+\.webp/);
    expect(img.getAttribute('srcset')).toMatch(/heroDesktop-\d+\.webp/);
    expect(img).toHaveAttribute('data-illustration', 'heroDesktop');
  });

  it('starts with only the night paintings in the dark theme (nothing else is requested)', () => {
    applyTheme('dark');
    const { container } = render(<HomeBackdrop />);

    expect(layers(container)).toHaveLength(1);
    const source = container.querySelector('picture source')!;
    const img = container.querySelector('picture img')!;
    expect(source.getAttribute('srcset')).toMatch(/heroMobileNight-\d+\.webp/);
    expect(img.getAttribute('srcset')).toMatch(/heroDesktopNight-\d+\.webp/);
    expect(img).toHaveAttribute('data-illustration', 'heroDesktopNight');
    expect(active(container)[0]).toBe(layer(container, 'dark'));
  });

  it('switches to the other painting once it has loaded, then keeps both for instant switches', () => {
    applyTheme('light');
    const { container } = render(<HomeBackdrop />);

    act(() => applyTheme('dark'));
    // The night painting is requested, but the day one stays until it has loaded.
    expect(layers(container)).toHaveLength(2);
    expect(active(container)).toEqual([layer(container, 'light')]);

    fireEvent.load(layer(container, 'dark')!.querySelector('img')!);
    expect(active(container)).toEqual([layer(container, 'dark')]);

    act(() => applyTheme('light'));
    expect(active(container)).toEqual([layer(container, 'light')]);
    expect(layers(container)).toHaveLength(2);
  });

  it('is decorative, with dimensions, loaded with high priority', () => {
    applyTheme('light');
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

  it('crossfades with the duration token (0ms under reduced motion), the old painting kept beneath', () => {
    expect(css).toMatch(
      /\.layer\[data-active='true'\]\s*\{[^}]*opacity:\s*1;[^}]*transition:\s*opacity var\(--duration-base\)/,
    );
    // The previous painting disappears only after the fade, so the page never shows through.
    expect(css).toMatch(
      /\.layer\s*\{[^}]*opacity:\s*0;[^}]*transition:\s*opacity 0s linear var\(--duration-base\)/,
    );
  });
});
