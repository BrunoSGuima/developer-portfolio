import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setMedia } from '../../test/media.ts';
import { canRun3D } from './capabilities.ts';
import { createMascotEngine, type MascotEngine } from './engine.ts';
import Mascot3DHost from './Mascot3DHost.tsx';
import { resetFailureForTests } from './useMascotDirector.ts';

const anchor = {
  x: 100,
  restLine: 68,
  ringLine: 58,
  size: 48,
  items: [100, 500],
  activeIndex: 0,
  spanLeft: 100,
  spanRight: 500,
};
const landing = { x: 900, y: 274, side: 'R' as const };
let nextLanding: typeof landing | null = landing;
const ring = { left: 60, right: 140, top: 52 };

let focusedRing: typeof ring | null = null;

vi.mock('./anchors.ts', () => ({
  measureNavAnchor: () => anchor,
  measureFocusRing: () => focusedRing,
}));
vi.mock('./landing.ts', () => ({ measureLanding: () => nextLanding }));
vi.mock('./capabilities.ts', () => ({ canRun3D: vi.fn(() => true) }));
vi.mock('./engine.ts', () => ({ createMascotEngine: vi.fn() }));

function fakeEngine() {
  return {
    place: vi.fn(),
    navigate: vi.fn(),
    reanchor: vi.fn(),
    setReducedMotion: vi.fn(),
    setFocusRing: vi.fn(),
    jumpToCard: vi.fn(),
    moveLanding: vi.fn(),
    isOnCardTrip: vi.fn(() => false),
    isSeated: vi.fn(() => true),
    dispose: vi.fn(),
    debug: {} as MascotEngine['debug'],
  };
}

const active = () => document.documentElement.dataset['mascot3d'];

describe('Mascot3DHost', () => {
  let engine: ReturnType<typeof fakeEngine>;

  beforeEach(() => {
    engine = fakeEngine();
    vi.mocked(canRun3D).mockReturnValue(true);
    vi.mocked(createMascotEngine).mockReset();
    vi.mocked(createMascotEngine).mockResolvedValue(engine);
    resetFailureForTests();
  });

  afterEach(() => {
    setMedia({ desktop: true, reducedMotion: false });
    delete document.documentElement.dataset['mascot3d'];
  });

  async function renderReady(section = 'home', locale = 'en') {
    const view = render(<Mascot3DHost sectionId={section} locale={locale} />);
    await waitFor(() => expect(active()).toBe('active'));
    return view;
  }

  it('is decorative and places the character once it is ready, hiding the 2D mascot only then', async () => {
    const { container } = render(<Mascot3DHost sectionId="home" locale="en" />);
    expect(active()).toBeUndefined();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).toBeNull();
    await waitFor(() => expect(active()).toBe('active'));
    expect(engine.place).toHaveBeenCalledExactlyOnceWith(anchor);
  });

  it('trips only when the section changes, on one engine', async () => {
    const { rerender } = await renderReady();
    rerender(<Mascot3DHost sectionId="home" locale="en" />);
    expect(engine.navigate).not.toHaveBeenCalled();
    rerender(<Mascot3DHost sectionId="about" locale="en" />);
    expect(engine.navigate).toHaveBeenCalledExactlyOnceWith(anchor);
    expect(createMascotEngine).toHaveBeenCalledTimes(1);
    expect(engine.dispose).not.toHaveBeenCalled();
  });

  it('stays put on pages with no section', async () => {
    const { rerender } = await renderReady();
    rerender(<Mascot3DHost sectionId={undefined} locale="en" />);
    expect(engine.navigate).not.toHaveBeenCalled();
    expect(engine.dispose).not.toHaveBeenCalled();
  });

  it('re-anchors without a trip when only the language changes', async () => {
    const { rerender } = await renderReady();
    rerender(<Mascot3DHost sectionId="home" locale="pt-BR" />);
    expect(engine.reanchor).toHaveBeenCalledWith(anchor);
    expect(engine.navigate).not.toHaveBeenCalled();
  });

  it('follows the reduced motion setting live', async () => {
    await renderReady();
    act(() => setMedia({ reducedMotion: true }));
    expect(engine.setReducedMotion).toHaveBeenLastCalledWith(true);
  });

  it('passes keyboard focus changes to the engine', async () => {
    await renderReady();
    focusedRing = ring;
    act(() => {
      document.dispatchEvent(new FocusEvent('focusin'));
    });
    expect(engine.setFocusRing).toHaveBeenLastCalledWith(ring);
    focusedRing = null;
    act(() => {
      document.dispatchEvent(new FocusEvent('focusout'));
    });
    expect(engine.setFocusRing).toHaveBeenLastCalledWith(null);
  });

  it('loads nothing below the desktop width', async () => {
    setMedia({ desktop: false });
    render(<Mascot3DHost sectionId="home" locale="en" />);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(createMascotEngine).not.toHaveBeenCalled();
    expect(active()).toBeUndefined();
  });

  it('removes the engine and restores 2D when the width falls below desktop', async () => {
    await renderReady();
    act(() => setMedia({ desktop: false }));
    expect(engine.dispose).toHaveBeenCalledOnce();
    expect(active()).toBeUndefined();
  });

  it('loads nothing when the device cannot run it', async () => {
    vi.mocked(canRun3D).mockReturnValue(false);
    render(<Mascot3DHost sectionId="home" locale="en" />);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(createMascotEngine).not.toHaveBeenCalled();
    expect(active()).toBeUndefined();
  });

  it('keeps the 2D mascot when the engine fails, without retrying', async () => {
    vi.mocked(createMascotEngine).mockRejectedValue(new Error('no model'));
    const first = render(<Mascot3DHost sectionId="home" locale="en" />);
    await waitFor(() => expect(createMascotEngine).toHaveBeenCalledOnce());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(active()).toBeUndefined();
    first.unmount();
    render(<Mascot3DHost sectionId="home" locale="en" />);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(createMascotEngine).toHaveBeenCalledOnce();
  });

  it('restores the 2D mascot when the WebGL context is lost, without retrying', async () => {
    const first = await renderReady();
    const options = vi.mocked(createMascotEngine).mock.calls[0]?.[1];
    act(() => options?.onContextLost());
    expect(engine.dispose).toHaveBeenCalledOnce();
    expect(active()).toBeUndefined();
    first.unmount();
    render(<Mascot3DHost sectionId="home" locale="en" />);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(createMascotEngine).toHaveBeenCalledOnce();
  });

  it('disposes an engine that finishes loading after unmount', async () => {
    const { unmount } = render(<Mascot3DHost sectionId="home" locale="en" />);
    unmount();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(active()).toBeUndefined();
    expect(engine.place).not.toHaveBeenCalled();
  });

  describe('the delay before the jump', () => {
    const seated = () => vi.mocked(createMascotEngine).mock.calls[0]?.[1].onSeated();

    let card: HTMLElement;

    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      nextLanding = landing;
      card = document.createElement('aside');
      card.dataset['funFact'] = '';
      document.body.append(card);
    });

    afterEach(() => {
      vi.useRealTimers();
      card.remove();
    });

    it('starts only when told it has settled, and jumps 5 s later, once', async () => {
      await renderReady();
      act(() => {
        vi.advanceTimersByTime(20_000);
      });
      expect(engine.jumpToCard).not.toHaveBeenCalled();
      act(() => {
        seated();
      });
      act(() => {
        vi.advanceTimersByTime(4_900);
      });
      expect(engine.jumpToCard).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(engine.jumpToCard).toHaveBeenCalledExactlyOnceWith(landing);
      act(() => {
        seated();
      });
      act(() => {
        vi.advanceTimersByTime(20_000);
      });
      expect(engine.jumpToCard).toHaveBeenCalledOnce();
    });

    it('navigation cancels the delay, and a new visit may jump again', async () => {
      const { rerender } = await renderReady();
      act(() => {
        seated();
      });
      act(() => {
        vi.advanceTimersByTime(3_000);
      });
      rerender(<Mascot3DHost sectionId="about" locale="en" />);
      act(() => {
        vi.advanceTimersByTime(20_000);
      });
      expect(engine.jumpToCard).not.toHaveBeenCalled();
      act(() => {
        seated();
      });
      act(() => {
        vi.advanceTimersByTime(5_100);
      });
      expect(engine.jumpToCard).toHaveBeenCalledOnce();
    });

    it('does not jump while the page has no section', async () => {
      const { rerender } = await renderReady();
      act(() => {
        seated();
      });
      rerender(<Mascot3DHost sectionId={undefined} locale="en" />);
      act(() => {
        vi.advanceTimersByTime(20_000);
      });
      expect(engine.jumpToCard).not.toHaveBeenCalled();
    });

    it('never jumps with reduced motion', async () => {
      setMedia({ reducedMotion: true });
      await renderReady();
      act(() => {
        seated();
      });
      act(() => {
        vi.advanceTimersByTime(20_000);
      });
      expect(engine.jumpToCard).not.toHaveBeenCalled();
    });

    it('stays seated when the layout has no room', async () => {
      nextLanding = null;
      await renderReady();
      act(() => {
        seated();
      });
      act(() => {
        vi.advanceTimersByTime(20_000);
      });
      expect(engine.jumpToCard).not.toHaveBeenCalled();
    });

    it('waits while a field has focus, then jumps once focus leaves', async () => {
      await renderReady();
      const field = document.createElement('input');
      document.body.append(field);
      field.focus();
      act(() => {
        seated();
      });
      act(() => {
        vi.advanceTimersByTime(20_000);
      });
      expect(engine.jumpToCard).not.toHaveBeenCalled();
      act(() => {
        field.blur();
      });
      expect(engine.jumpToCard).toHaveBeenCalledOnce();
      field.remove();
    });

    it('waits while the card’s top edge is off screen', async () => {
      await renderReady();
      const top = vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({ top: -50 } as DOMRect);
      act(() => {
        seated();
      });
      act(() => {
        vi.advanceTimersByTime(20_000);
      });
      expect(engine.jumpToCard).not.toHaveBeenCalled();
      top.mockRestore();
    });

    it('keeps the time it had left while the tab is hidden', async () => {
      await renderReady();
      act(() => {
        seated();
      });
      act(() => {
        vi.advanceTimersByTime(3_000);
      });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      act(() => {
        vi.advanceTimersByTime(20_000);
      });
      expect(engine.jumpToCard).not.toHaveBeenCalled();
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      act(() => {
        vi.advanceTimersByTime(1_900);
      });
      expect(engine.jumpToCard).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(engine.jumpToCard).toHaveBeenCalledOnce();
    });
  });
});
