import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FunFact from '../components/FunFact/FunFact.tsx';
import type { FunFact as FunFactContent } from '../sections/registry.ts';
import FunFactStage, { type FunFactComposition } from './FunFactStage.tsx';
import stageCss from './FunFactStage.module.css?raw';

const fact: FunFactContent = { text: 'Built with React.', tech: ['react', 'typescript'] };

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
  it('sizes the presenting mascot by the stage height, anchored at its fingertip', () => {
    // jsdom can't apply media queries: check the rule. The mascot stands on the stage's bottom
    // edge; its height and left offset are derived together (see the stylesheet comment).
    // The ≥ 64rem rule: the one that positions it (the first is the mobile layout, the last
    // the 80rem card-alignment override, tested below).
    const presenter = [
      ...stageCss.matchAll(/\.stage\[data-composition='hero'\] \.presenter\s*\{([^}]*)\}/g),
    ]
      .map((match) => match[1] ?? '')
      .find((block) => /bottom:\s*0;/.test(block));

    expect(presenter).toMatch(/bottom:\s*0;/);
    expect(presenter).toMatch(/left:\s*calc\(-4% \+ 0\.068 \* var\(--home-stage-height\)\);/);
    expect(presenter).toMatch(/height:\s*84\.2%;/);
    expect(presenter).not.toMatch(/transform/);
  });

  it('caps the stage width, so the composition is identical on wide containers', () => {
    expect(stageCss).toMatch(
      /width:\s*min\(calc\(100% \* \(1 - var\(--home-hero-text-ratio\)\)\), var\(--home-stage-max\)\)/,
    );
  });

  it('from 64rem, lines the card up with the third "What I do" card, the mascot following it', () => {
    const wide = stageCss.slice(stageCss.indexOf('@media (min-width: 64rem) {\n  .stage'));

    expect(wide).toMatch(
      /--home-card-width:\s*calc\(\s*\(min\(100cqi - 2 \* var\(--gutter\), var\(--content-max\)\) - 2 \* var\(--space-4\)\) \/ 3 \+\s*var\(--home-stage-shift\)\s*\)/,
    );
    expect(wide).toMatch(/\.frame\s*\{\s*width:\s*var\(--home-card-width\);/);
    expect(wide).toMatch(
      /\.presenter\s*\{\s*left:\s*calc\(72% - var\(--home-card-width\) \+ 0\.068 \* var\(--home-stage-height\)\);/,
    );
  });

  it('between 64rem and 80rem, stands the mascot below the taller card, fingertip just under it', () => {
    const band = stageCss.slice(
      stageCss.indexOf('@media (min-width: 64rem) and (max-width: 79.99rem)'),
    );

    expect(band).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\)/);
    expect(band).toMatch(/height:\s*auto/);
    expect(band).toMatch(
      /margin-block-start:\s*calc\(var\(--space-2\) - 0\.324 \* var\(--home-mascot-height\)\)/,
    );
    expect(band).toMatch(/--home-mascot-height:\s*calc\(0\.842 \* var\(--home-stage-height\)\)/);
  });

  it('nudges the whole stage (card and mascot together) left by a single token', () => {
    expect(stageCss).toMatch(
      /right:\s*calc\(var\(--home-stage-shift\) \* -1 \+ var\(--home-stage-nudge\)\);/,
    );
  });
});
