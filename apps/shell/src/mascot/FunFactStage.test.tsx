import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FunFact from '../components/FunFact/FunFact.tsx';
import type { FunFact as FunFactContent } from '../sections/registry.ts';
import { same } from '../test/localized.ts';
import FunFactStage, { type FunFactComposition } from './FunFactStage.tsx';
import stageCss from './FunFactStage.module.css?raw';

const fact: FunFactContent = { text: same('Built with React.'), tech: ['react', 'typescript'] };

function renderStage(composition: FunFactComposition) {
  const view = render(
    <FunFactStage composition={composition} sectionId="about">
      <FunFact fact={fact} />
    </FunFactStage>,
  );
  const slot = (name: string) => view.container.querySelector<HTMLElement>(`[data-slot="${name}"]`);
  const mascots = () => view.container.querySelectorAll('[data-mascot="fun-fact"]');
  const card = () => screen.getByRole('complementary', { name: 'Fun fact' });
  const zIndex = (name: string) => Number(getComputedStyle(slot(name)!).zIndex);
  return { ...view, slot, mascots, card, zIndex };
}

describe('FunFactStage: hero (Home)', () => {
  it('shows the approved A3 mascot as a decorative image with dimensions', () => {
    const { slot, mascots } = renderStage('hero');

    expect(mascots()).toHaveLength(1);
    const layer = slot('presenter')!;
    const img = layer.querySelector('img')!;
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(getComputedStyle(layer).pointerEvents).toBe('none');
    expect(img).toHaveAttribute('data-illustration', 'mascotPresenting');
    expect(img).toHaveAttribute('alt', '');
    expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
    expect(layer.style.aspectRatio).toMatch(/^\d+ \/ \d+$/);
  });

  it('does not render the A4 desk props (the backdrop already has enough detail)', () => {
    const { container } = renderStage('hero');

    expect(container.querySelector('[data-illustration="heroProps"]')).toBeNull();
    expect(container.querySelectorAll('img')).toHaveLength(1);
  });

  it('stacks the card above the mascot', () => {
    const { zIndex, slot, card } = renderStage('hero');

    expect(zIndex('presenter')).toBeLessThan(zIndex('frame'));
    expect(slot('frame')).toContainElement(card());
    expect(getComputedStyle(slot('frame')!.parentElement!).isolation).toBe('isolate');
  });

  it("keeps the card's text and badges as real HTML, outside every image layer", () => {
    const { slot, card } = renderStage('hero');

    expect(card()).toHaveTextContent('Built with React.');
    expect(screen.getByRole('list', { name: 'Technologies' })).toBeInTheDocument();
    expect(slot('presenter')).not.toHaveTextContent(/\S/);
  });
});

describe('FunFactStage: peek (other pages)', () => {
  it('draws A5 behind the card and repeats only its fingertips in front of it', () => {
    const { slot, card, zIndex } = renderStage('peek');
    const back = slot('peek')!;
    const front = slot('fingertips')!;
    const cardLayer = slot('card')!;

    expect(back.parentElement).toBe(cardLayer.parentElement);
    expect(front.parentElement).toBe(cardLayer.parentElement);
    expect(cardLayer).toContainElement(card());
    expect(zIndex('peek')).toBeLessThan(zIndex('card'));
    expect(zIndex('card')).toBeLessThan(zIndex('fingertips'));

    const backImg = back.querySelector('img')!;
    const frontImg = front.querySelector('img')!;
    expect(frontImg.getAttribute('src')).toBe(backImg.getAttribute('src'));
    expect(front.querySelector('[data-layer="front"]')).not.toBeNull();
  });

  it('aligns the ledge with the card edge using the delivered art’s proportions', () => {
    const { slot } = renderStage('peek');
    const stage = slot('frame')!.parentElement!;

    expect(Number(stage.style.getPropertyValue('--peek-ledge'))).toBeCloseTo(918 / 978, 4);
    expect(Number(stage.style.getPropertyValue('--peek-aspect-height'))).toBeGreaterThan(0);
  });

  it('counts as one Fun Fact mascot, decorative and never wrapping the card content', () => {
    const { mascots, slot } = renderStage('peek');

    expect(mascots()).toHaveLength(1);
    for (const name of ['peek', 'fingertips']) {
      expect(slot(name)).not.toHaveTextContent(/\S/);
      expect(getComputedStyle(slot(name)!).pointerEvents).toBe('none');
      expect(slot(name)!.querySelector('[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it('shows no presenting mascot', () => {
    const { slot } = renderStage('peek');

    expect(slot('presenter')).toBeNull();
  });
});

describe('FunFactStage: hero geometry (≥ 64rem)', () => {
  // jsdom can't apply media queries: these check the rules. Chromium verified the result (both
  // languages, 320–2560px): English is pixel-identical to Step 8 and the fingertip stays visible.
  const hero = stageCss.slice(stageCss.indexOf('@media (min-width: 64rem) {\n  .stage'));
  const rule = (selector: string) =>
    new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(
      hero,
    )?.[1] ?? '';

  it('sizes the presenting mascot by the stage height, anchored at its fingertip', () => {
    const presenter = rule(".stage[data-composition='hero'] .presenter");

    expect(presenter).toMatch(/align-self:\s*end;/);
    expect(presenter).toMatch(
      /left:\s*calc\(72% - var\(--home-card-width\) \+ 0\.068 \* var\(--home-stage-height\)\);/,
    );
    expect(presenter).toMatch(/height:\s*var\(--home-mascot-height\);/);
    expect(presenter).toMatch(
      /margin:\s*calc\(var\(--home-fingertip-gap\) - 0\.324 \* var\(--home-mascot-height\)\) 0 0;/,
    );
    expect(presenter).not.toMatch(/transform/);
    expect(hero).toMatch(/--home-mascot-height:\s*calc\(0\.842 \* var\(--home-stage-height\)\)/);
  });

  it('caps the stage width, so the composition is identical on wide containers', () => {
    expect(stageCss).toMatch(
      /width:\s*min\(calc\(100% \* \(1 - var\(--home-hero-text-ratio\)\)\), var\(--home-stage-max\)\)/,
    );
  });

  it('from 64rem, lines the card up with the third "What I do" card', () => {
    expect(hero).toMatch(
      /--home-card-width:\s*calc\(\s*\(min\(100cqi - 2 \* var\(--gutter\), var\(--content-max\)\) - 2 \* var\(--space-4\)\) \/ 3 \+\s*var\(--home-stage-shift\)\s*\)/,
    );
    expect(rule(".stage[data-composition='hero'] .frame")).toMatch(
      /justify-self:\s*end;[^}]*width:\s*var\(--home-card-width\);/,
    );
  });

  it('grows the stage when the card is taller (narrow widths, longer translations)', () => {
    const stage = rule(".stage[data-composition='hero']");
    expect(stage).toMatch(/grid-template-rows:\s*auto 1fr;/);
    expect(stage).toMatch(/min-height:\s*var\(--home-stage-min\);/);
    expect(stage).not.toMatch(/(^|[^-])height:\s*var\(--home-stage-height\)/);

    // 64–80rem: the mascot always follows the card; from 80rem the stage keeps its fixed height
    // unless the card needs more room.
    const band = stageCss.slice(stageCss.indexOf('(max-width: 79.99rem)'));
    expect(band).toMatch(/--home-stage-min:\s*0px;\s*--home-fingertip-gap:\s*var\(--space-2\);/);
    const wide = stageCss.slice(stageCss.lastIndexOf('@media (min-width: 80rem)'));
    expect(wide).toMatch(
      /--home-stage-min:\s*var\(--home-stage-height\);\s*--home-fingertip-gap:\s*var\(--space-1\);/,
    );
  });

  it('nudges the whole stage (card and mascot together) left by a single token', () => {
    expect(stageCss).toMatch(
      /right:\s*calc\(var\(--home-stage-shift\) \* -1 \+ var\(--home-stage-nudge\)\);/,
    );
  });
});
