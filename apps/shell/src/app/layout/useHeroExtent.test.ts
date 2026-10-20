import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useHeroExtent } from './useHeroExtent.ts';

const rect = (top: number, bottom: number) =>
  ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top }) as DOMRect;

function setup({ heroBottom, stageBottom }: { heroBottom: number; stageBottom?: number }) {
  const region = document.createElement('div');
  const hero = document.createElement('div');
  hero.dataset.slot = 'hero';
  region.append(hero);
  vi.spyOn(region, 'getBoundingClientRect').mockReturnValue(rect(100, 2000));
  vi.spyOn(hero, 'getBoundingClientRect').mockReturnValue(rect(120, heroBottom));
  if (stageBottom !== undefined) {
    const stage = document.createElement('div');
    stage.dataset.composition = 'hero';
    region.append(stage);
    vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue(rect(140, stageBottom));
  }
  document.body.append(region);
  return { region, ref: { current: region } };
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('useHeroExtent', () => {
  it('covers the page hero when it is the lower element', () => {
    const { region, ref } = setup({ heroBottom: 700, stageBottom: 650 });

    renderHook(() => useHeroExtent(ref, true));

    expect(region.style.getPropertyValue('--home-hero-bottom')).toBe('600px');
  });

  it('covers the illustrated stage when it reaches lower than the hero text', () => {
    const { region, ref } = setup({ heroBottom: 600, stageBottom: 690 });

    renderHook(() => useHeroExtent(ref, true));

    expect(region.style.getPropertyValue('--home-hero-bottom')).toBe('590px');
  });

  it("publishes the stage's rendered height, so the Home spacer can follow a taller stage", () => {
    const { region, ref } = setup({ heroBottom: 600, stageBottom: 706 });

    renderHook(() => useHeroExtent(ref, true));

    // The stage's rect is 140 → 706.
    expect(region.style.getPropertyValue('--home-stage-block')).toBe('566px');
  });

  it('sets nothing when disabled, and clears the value when it becomes disabled', () => {
    const { region, ref } = setup({ heroBottom: 600 });

    const { rerender } = renderHook(({ enabled }) => useHeroExtent(ref, enabled), {
      initialProps: { enabled: true },
    });
    expect(region.style.getPropertyValue('--home-hero-bottom')).toBe('500px');

    rerender({ enabled: false });
    expect(region.style.getPropertyValue('--home-hero-bottom')).toBe('');
    expect(region.style.getPropertyValue('--home-stage-block')).toBe('');
  });
});
