import { describe, expect, it } from 'vitest';
import tokens from './tokens.css?raw';

/**
 * Both themes (ADR-0017), checked from tokens.css itself: every colour pair the interface uses
 * meets WCAG 2.x AA (4.5:1 for text, 3:1 for control borders and the focus ring), and the dark
 * theme only remaps colour tokens.
 */

/** The declarations of the first block whose selector is exactly `selector`. */
function block(selector: string): Record<string, string> {
  const start = tokens.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`No ${selector} block in tokens.css`);
  const body = tokens.slice(start + selector.length + 2, tokens.indexOf('\n}', start));
  const declarations: Record<string, string> = {};
  for (const match of body
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .matchAll(/(--[\w-]+|color-scheme):\s*([^;]+);/g)) {
    declarations[match[1]!] = match[2]!.trim();
  }
  return declarations;
}

const light = block(':root');
const darkOverrides = block(":root[data-theme='dark']");
const dark = { ...light, ...darkOverrides };

type Theme = typeof light;

function resolve(theme: Theme, name: string): string {
  const value = theme[name];
  if (value === undefined) throw new Error(`Undefined token ${name}`);
  const reference = /^var\((--[\w-]+)\)$/.exec(value);
  return reference ? resolve(theme, reference[1]!) : value;
}

function luminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`Not a 6-digit hex colour: ${hex}`);
  const channel = (offset: number) => {
    const c = parseInt(match[1]!.slice(offset, offset + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function contrast(theme: Theme, foreground: string, background: string): number {
  const [a, b] = [luminance(resolve(theme, foreground)), luminance(resolve(theme, background))];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const SURFACES = ['--color-bg', '--color-surface', '--color-surface-raised'];
const TEXT = [
  '--color-text',
  '--color-text-muted',
  '--color-text-slate',
  '--color-accent',
  '--color-danger',
];
const NON_TEXT = ['--color-control-border', '--color-focus'];
const BADGES = ['blue', 'slate', 'green', 'burgundy'];

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('the %s theme', (_name, theme) => {
  it.each(TEXT.flatMap((text) => SURFACES.map((surface) => [text, surface])))(
    '%s on %s is at least 4.5:1',
    (text, surface) => {
      expect(contrast(theme, text, surface)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(NON_TEXT.flatMap((token) => SURFACES.map((surface) => [token, surface])))(
    '%s on %s is at least 3:1',
    (token, surface) => {
      expect(contrast(theme, token, surface)).toBeGreaterThanOrEqual(3);
    },
  );

  it('the primary button text is at least 4.5:1, and the button stands out from the page', () => {
    expect(contrast(theme, '--color-on-primary', '--color-primary')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme, '--color-primary', '--color-surface')).toBeGreaterThanOrEqual(3);
  });

  it.each(BADGES)('the %s badge text is at least 4.5:1 on its background', (badge) => {
    expect(contrast(theme, `--badge-${badge}-fg`, `--badge-${badge}-bg`)).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});

describe('the dark theme', () => {
  it('sets the dark colour scheme (native controls and scrollbars) and the light one by default', () => {
    expect(light['color-scheme']).toBe('light');
    expect(darkOverrides['color-scheme']).toBe('dark');
  });

  it('remaps only colours: no spacing, type, layout or motion token changes', () => {
    const colourish = /^--(color|badge)-|^--hero-scrim$|^--shadow-(sm|md)$|^color-scheme$/;
    expect(Object.keys(darkOverrides).filter((name) => !colourish.test(name))).toEqual([]);
  });

  it('gives every themed purpose colour a dark value', () => {
    const purpose = Object.keys(light).filter((name) =>
      /^--color-(bg|surface|surface-raised|text|text-muted|text-slate|primary|on-primary|accent|border|focus|danger|control-border)$/.test(
        name,
      ),
    );
    for (const name of [
      ...purpose,
      ...BADGES.flatMap((b) => [`--badge-${b}-bg`, `--badge-${b}-fg`]),
    ]) {
      expect(darkOverrides, name).toHaveProperty(name);
    }
  });

  it('keeps the light theme as approved: floating panels share the surface colour', () => {
    expect(light['--color-surface-raised']).toBe('var(--color-surface)');
    expect(light['--color-bg']).toBe('var(--color-sand-100)');
    expect(light['--color-surface']).toBe('var(--color-cream-50)');
  });
});
