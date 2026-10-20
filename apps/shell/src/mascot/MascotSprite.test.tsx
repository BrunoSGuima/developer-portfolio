import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type MascotArtPose, mascotAssets } from './assets.ts';
import MascotSprite from './MascotSprite.tsx';

const POSES = Object.keys(mascotAssets) as MascotArtPose[];
/** The walking navigation mascot: placeholder SVG until its final frames (ART-BRIEF A6) exist. */
const SVG_POSES: MascotArtPose[] = ['idle', 'walking', 'pointing'];
/** The Fun Fact mascot: the approved raster illustrations (A3, A5). */
const IMAGE_POSES: Record<string, string> = {
  presenting: 'mascotPresenting',
  peeking: 'mascotPeeking',
};
const AIMS = ['up', 'down', 'forward'] as const;
const REQUIRED_PARTS = ['hair', 'face', 'eyes', 'smile', 'suit', 'shirt', 'tie'];
const FORBIDDEN_PARTS = ['glasses', 'beard', 'moustache'];

describe('MascotSprite', () => {
  it('has art for every pose', () => {
    expect([...POSES].sort()).toEqual(['idle', 'peeking', 'pointing', 'presenting', 'walking']);
  });

  it.each(POSES)('is hidden from assistive technology in the %s pose', (pose) => {
    const { container } = render(<MascotSprite pose={pose} facing="right" aim="down" />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0);
  });

  describe('navigation poses (placeholder SVG)', () => {
    it.each(SVG_POSES)('draws the character traits in the %s pose', (pose) => {
      const { container } = render(<MascotSprite pose={pose} facing="right" aim="down" />);

      expect(container.querySelector('svg')).toHaveAttribute('focusable', 'false');
      for (const part of REQUIRED_PARTS) {
        expect(container.querySelector(`[data-part="${part}"]`)).not.toBeNull();
      }
    });

    it.each(SVG_POSES)('has no glasses, beard or moustache in the %s pose (any aim)', (pose) => {
      for (const aim of AIMS) {
        const { container, unmount } = render(
          <MascotSprite pose={pose} facing="right" aim={aim} />,
        );
        for (const part of FORBIDDEN_PARTS) {
          expect(container.querySelector(`[data-part="${part}"]`)).toBeNull();
        }
        unmount();
      }
    });

    it.each(AIMS)('aims the pointing arm %s', (aim) => {
      const { container } = render(<MascotSprite pose="pointing" facing="right" aim={aim} />);

      expect(container.querySelector('[data-part="arm-pointing"]')).toHaveAttribute(
        'data-aim',
        aim,
      );
    });

    it('marks the facing direction (left is mirrored by CSS)', () => {
      const { container } = render(<MascotSprite pose="idle" facing="left" aim="down" />);

      expect(container.firstElementChild).toHaveAttribute('data-facing', 'left');
    });
  });

  describe('Fun Fact poses (approved illustrations)', () => {
    it.each(Object.entries(IMAGE_POSES))(
      'draws the %s pose from the %s illustration, as a decorative image with dimensions',
      (pose, illustration) => {
        const { container } = render(
          <MascotSprite pose={pose as MascotArtPose} facing="right" aim="up" />,
        );
        const img = container.querySelector('img')!;

        expect(container.querySelector('svg')).toBeNull();
        expect(img).toHaveAttribute('alt', '');
        expect(img).toHaveAttribute('data-illustration', illustration);
        expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
        expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
        expect(img.getAttribute('srcset')).toMatch(/\.webp\b.* \d+w/);
      },
    );
  });
});
