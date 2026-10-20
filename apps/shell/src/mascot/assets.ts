import type { ComponentType } from 'react';
import { PeekingImage, PresentingImage } from './art/IllustrationArt.tsx';
import { type Aim, IdleArt, PointingArt, WalkingArt } from './art/PlaceholderArt.tsx';
import type { MascotPose } from './machine.ts';

export type { Aim };

/**
 * Every pose that has art: the walking machine's poses (navigation mascot, still placeholder SVG)
 * plus the Fun Fact mascot's static ones, which use the approved raster illustrations
 * ('presenting' in the Home hero, 'peeking' over the card elsewhere).
 */
export type MascotArtPose = MascotPose | 'presenting' | 'peeking';

/**
 * THE asset seam. Each pose maps to a component that draws it, facing right.
 * To ship the final character art (SVG, PNG frames, a sprite sheet or Lottie), wrap it in
 * components with the same props, point this map at them and set `isPlaceholderArt` to false.
 * Behaviour, layout and tests do not change.
 */
export const mascotAssets: Record<MascotArtPose, ComponentType<{ aim: Aim }>> = {
  idle: IdleArt,
  walking: WalkingArt,
  pointing: PointingArt,
  presenting: PresentingImage,
  peeking: PeekingImage,
};

/**
 * True while the navigation mascot's poses (idle, walking, pointing) are still the placeholder
 * SVG; the Architecture page wording depends on it. The Fun Fact mascot already uses final art.
 */
export const isPlaceholderArt = true;
