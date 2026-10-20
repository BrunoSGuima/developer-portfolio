import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setMedia } from '../test/media.ts';
import FunFactMascot from './FunFactMascot.tsx';

function renderMascot(sectionId: string | undefined, layer: 'back' | 'front' = 'back') {
  const view = render(<FunFactMascot sectionId={sectionId} layer={layer} />);
  const root = () => view.container.firstElementChild!;
  const popLayer = () => view.container.querySelector('[data-pop]')!;
  const show = (id: string | undefined) =>
    view.rerender(<FunFactMascot sectionId={id} layer={layer} />);
  return { ...view, root, popLayer, show };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('FunFactMascot (peeking over the card, approved A5 art)', () => {
  it('is decorative and draws the peeking illustration', () => {
    const { root } = renderMascot('about');

    expect(root()).toHaveAttribute('aria-hidden', 'true');
    expect(root()).toHaveAttribute('data-pose', 'peeking');
    expect(root().querySelector('img')).toHaveAttribute('data-illustration', 'mascotPeeking');
  });

  it('marks only the back layer as the Fun Fact mascot; the front layer is its fingertips', () => {
    const back = renderMascot('about', 'back');
    expect(back.root()).toHaveAttribute('data-mascot', 'fun-fact');
    back.unmount();

    const front = renderMascot('about', 'front');
    expect(front.root()).not.toHaveAttribute('data-mascot');
    expect(front.root()).toHaveAttribute('data-layer', 'front');
  });

  it('replays its pop-up when the section changes, not on the same section', () => {
    const { popLayer, show } = renderMascot('about');
    const first = popLayer();

    show('about');
    expect(popLayer()).toBe(first);
    show('projects');
    expect(popLayer()).not.toBe(first);
  });

  it('is stationary and uses no timers', () => {
    const { root, show, unmount } = renderMascot('about');

    show('projects');
    show('contact');
    expect(vi.getTimerCount()).toBe(0);
    expect((root() as HTMLElement).style.transform).toBe('');
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('turns the pop-up off under reduced motion', () => {
    setMedia({ reducedMotion: true });
    const { root } = renderMascot('about');

    expect(root()).toHaveAttribute('data-motion', 'reduced');
  });
});
