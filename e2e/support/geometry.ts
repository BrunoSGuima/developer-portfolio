import type { Page } from '@playwright/test';

export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function overlaps(a: Box, b: Box): boolean {
  return (
    Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
    Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)
  );
}

/**
 * The Home scene's geometry, in page coordinates. The presenting mascot's fingertip sits at
 * 86.2% / 32.4% of the A3 art and its figure spans about 15–87% × 3–98% of the image (ADR-0005);
 * text boxes are measured with ranges, so a block's empty width doesn't count.
 */
export function homeScene(page: Page) {
  return page.evaluate(() => {
    const box = (rect: DOMRect) => ({
      left: rect.left,
      right: rect.right,
      top: rect.top + scrollY,
      bottom: rect.bottom + scrollY,
    });
    const textBox = (element: Element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return box(range.getBoundingClientRect());
    };
    const stage = document.querySelector('[data-composition="hero"]');
    const image = stage?.querySelector('[data-slot="presenter"] img');
    const card = stage?.querySelector('[data-fun-fact]');
    const whatIDo = document.querySelector('#what-i-do')?.closest('section');
    if (!image || !card || !whatIDo) return null;
    const art = image.getBoundingClientRect();
    const cardBox = box(card.getBoundingClientRect());
    const heroText = [...document.querySelectorAll('[data-slot="hero"] :is(h1, p, a)')].map(
      textBox,
    );
    return {
      card: cardBox,
      thirdCard: box(whatIDo.querySelectorAll('li')[2]!.getBoundingClientRect()),
      cards: box(whatIDo.querySelector('ul')!.getBoundingClientRect()),
      heading: textBox(whatIDo.querySelector('h2')!),
      heroText,
      figure: {
        left: art.left + 0.15 * art.width,
        right: art.left + 0.87 * art.width,
        top: art.top + scrollY + 0.03 * art.height,
        bottom: art.top + scrollY + 0.98 * art.height,
      },
      fingertip: {
        x: art.left + 0.862 * art.width,
        y: art.top + scrollY + 0.324 * art.height,
      },
    };
  });
}
