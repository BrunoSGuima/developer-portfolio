import type { CSSProperties, ReactNode } from 'react';
import { getIllustration, PEEKING_LEDGE } from './art/illustrations.ts';
import FunFactMascot from './FunFactMascot.tsx';
import styles from './FunFactStage.module.css';
import MascotSprite from './MascotSprite.tsx';

export type FunFactComposition = 'hero' | 'peek';

interface FunFactStageProps {
  /**
   * 'hero' (Home): the A3 mascot presents the card over the shell's illustrated backdrop.
   * 'peek' (other pages): the A5 mascot peeks over the card.
   */
  composition: FunFactComposition;
  sectionId: string | undefined;
  /** The Fun Fact card. */
  children: ReactNode;
}

const aspect = (key: 'mascotPresenting' | 'mascotPeeking') => {
  const { width, height } = getIllustration(key);
  return `${width} / ${height}`;
};

/**
 * Layout only: places the stationary Fun Fact mascot around the card. The stage is its own
 * stacking context and the card is always above the artwork (mascot 3, card 4 on Home; on other
 * pages the peeking mascot sits at 0 behind the card at 1, with only its fingertips repeated at 2
 * in front), so nothing covers the card's text or badges.
 * Behaviour lives in FunFactMascot; the drawings come from mascot/assets.ts.
 */
function FunFactStage({ composition, sectionId, children }: FunFactStageProps) {
  const hero = composition === 'hero';
  const peeking = getIllustration('mascotPeeking');
  const peekStyle = { aspectRatio: aspect('mascotPeeking') };
  // The ledge (the hands' line) must sit exactly on the card's top edge: the strip reserved above
  // the card = peek width × (height / width) × ledge position, all from the delivered art.
  const stageStyle = {
    '--peek-ledge': PEEKING_LEDGE,
    '--peek-aspect-height': peeking.height / peeking.width,
  } as CSSProperties;

  return (
    <div className={styles.stage} data-composition={composition} style={stageStyle}>
      {hero && (
        <div
          className={styles.presenter}
          style={{ aspectRatio: aspect('mascotPresenting') }}
          aria-hidden="true"
          data-slot="presenter"
          data-mascot="fun-fact"
          data-pose="presenting"
        >
          <MascotSprite pose="presenting" facing="right" aim="up" />
        </div>
      )}
      <div className={styles.frame} data-slot="frame">
        {composition === 'peek' && (
          <div className={styles.peek} style={peekStyle} data-slot="peek">
            <FunFactMascot sectionId={sectionId} layer="back" />
          </div>
        )}
        <div className={styles.cardLayer} data-slot="card">
          {children}
        </div>
        {composition === 'peek' && (
          <div
            className={`${styles.peek} ${styles.fingertips}`}
            style={peekStyle}
            data-slot="fingertips"
          >
            <FunFactMascot sectionId={sectionId} layer="front" />
          </div>
        )}
      </div>
    </div>
  );
}

export default FunFactStage;
