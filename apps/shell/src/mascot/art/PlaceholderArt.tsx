import type { ReactNode } from 'react';
import styles from './PlaceholderArt.module.css';

/**
 * Placeholder chibi for the walking navigation mascot only (idle, walking, pointing), until its
 * final frames (ART-BRIEF A6) exist: clean-shaven, no glasses, dark wavy hair, black suit, white
 * shirt and burgundy tie. Drawn facing right in a 36 × 48 box; MascotSprite mirrors it to face
 * left. Replace via ../assets.ts.
 */

/** Pointing direction: up-right (Home), down-right (header) or straight ahead (peeking). */
export type Aim = 'up' | 'down' | 'forward';

function Head() {
  return (
    <g>
      <circle data-part="face" className={styles.skin} cx="18" cy="15.5" r="10" />
      <path
        data-part="hair"
        className={styles.hair}
        d="M7.6 17C6.4 10.5 8.4 6.6 11 5.6c.2-1.7 2.4-2.9 4.1-1.9 1.2-1.4 3.8-1.5 5 -.2 1.6-1 4-.3 4.7 1.5 2.8.6 5.2 4.4 3.8 12l-1-3.4c-.9-2.4-3-3.3-5.2-2.8-2-1.4-6.2-1.4-8.2 0-2.4-.5-4.6.5-5.5 2.8Z"
      />
      <path data-part="smile" className={styles.smile} d="M15.2 21.6q2.8 2.2 5.6 0" />
      <g data-part="eyes">
        <path className={styles.brow} d="M11.6 12.6q2-1 3.8-.2M20.6 12.4q1.8-.8 3.8.2" />
        <ellipse className={styles.eye} cx="13.6" cy="16" rx="1.5" ry="1.9" />
        <ellipse className={styles.eye} cx="22.4" cy="16" rx="1.5" ry="1.9" />
        <circle className={styles.highlight} cx="14.1" cy="15.3" r=".55" />
        <circle className={styles.highlight} cx="22.9" cy="15.3" r=".55" />
      </g>
    </g>
  );
}

function Torso() {
  return (
    <g>
      <path data-part="suit" className={styles.suit} d="M9.2 40l1-9.6q7.8-4.6 15.6 0l1 9.6Z" />
      <path
        data-part="shirt"
        className={styles.shirt}
        d="M14.8 27.6 18 34.2l3.2-6.6q-3.2-1-6.4 0Z"
      />
      <path data-part="tie" className={styles.tie} d="M17.1 28.4h1.8l.7 4.4L18 35l-1.6-2.2Z" />
      <path className={styles.lapel} d="M14.8 27.6 17.2 35.2M21.2 27.6l-2.4 7.6" />
    </g>
  );
}

function Arm({ d, hand }: { d: string; hand: [number, number] }) {
  return (
    <g>
      <path className={styles.sleeve} d={d} />
      <circle className={styles.skin} cx={hand[0]} cy={hand[1]} r="1.4" />
    </g>
  );
}

const backArm = <Arm d="M10.6 31 9.2 38" hand={[9, 38.8]} />;
const restingArm = <Arm d="M25.4 31 26.8 38" hand={[27, 38.8]} />;

function StandingLegs() {
  return (
    <g>
      <rect className={styles.suit} x="12.6" y="39" width="4.4" height="6" rx="1" />
      <rect className={styles.suit} x="19" y="39" width="4.4" height="6" rx="1" />
      <ellipse className={styles.shoe} cx="14.6" cy="45.9" rx="2.8" ry="1.3" />
      <ellipse className={styles.shoe} cx="21.4" cy="45.9" rx="2.8" ry="1.3" />
    </g>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 36 48" aria-hidden="true" focusable="false" className={styles.svg}>
      {children}
    </svg>
  );
}

export function IdleArt() {
  return (
    <Frame>
      <StandingLegs />
      {backArm}
      <Torso />
      {restingArm}
      <Head />
    </Frame>
  );
}

export function WalkingArt() {
  return (
    <Frame>
      {/* Two leg frames, alternated by CSS (frozen on frame A with reduced motion). */}
      <g className={styles.frameA}>
        <path className={styles.leg} d="M14.8 39.5 12.6 45M21.2 39.5 23.4 45" />
        <ellipse className={styles.shoe} cx="12.6" cy="45.9" rx="2.6" ry="1.2" />
        <ellipse className={styles.shoe} cx="24" cy="45.9" rx="2.6" ry="1.2" />
      </g>
      <g className={styles.frameB}>
        <path className={styles.leg} d="M14.8 39.5 16.4 45M21.2 39.5 19.6 45" />
        <ellipse className={styles.shoe} cx="17" cy="45.9" rx="2.6" ry="1.2" />
        <ellipse className={styles.shoe} cx="20.2" cy="45.9" rx="2.6" ry="1.2" />
      </g>
      {backArm}
      <Torso />
      {restingArm}
      <Head />
    </Frame>
  );
}

export function PointingArt({ aim }: { aim: Aim }) {
  return (
    <Frame>
      <StandingLegs />
      {backArm}
      <Torso />
      <g data-part="arm-pointing" data-aim={aim}>
        {aim === 'up' && (
          <>
            <Arm d="M25.2 31 30.8 25.6" hand={[31.6, 24.8]} />
            <path className={styles.finger} d="M32.5 23.9 33.6 22.8" />
          </>
        )}
        {aim === 'down' && (
          <>
            <Arm d="M25.2 31 30.6 36" hand={[31.4, 36.8]} />
            <path className={styles.finger} d="M32.3 37.7 33.4 38.8" />
          </>
        )}
        {aim === 'forward' && (
          <>
            <Arm d="M25.2 31 32 30" hand={[33, 29.9]} />
            <path className={styles.finger} d="M34.2 29.8 35.6 29.6" />
          </>
        )}
      </g>
      <Head />
    </Frame>
  );
}
