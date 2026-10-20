import { type Aim, type MascotArtPose, mascotAssets } from './assets.ts';
import type { Facing } from './machine.ts';
import styles from './MascotSprite.module.css';
import { useReducedMotion } from './useMediaQuery.ts';

interface MascotSpriteProps {
  pose: MascotArtPose;
  facing: Facing;
  aim: Aim;
}

/** Draws the mascot's current pose, mirrored to face left when needed. Purely decorative. */
function MascotSprite({ pose, facing, aim }: MascotSpriteProps) {
  const Art = mascotAssets[pose];
  const reducedMotion = useReducedMotion();

  return (
    <div
      className={styles.sprite}
      data-pose={pose}
      data-facing={facing}
      data-motion={reducedMotion ? 'reduced' : 'full'}
      aria-hidden="true"
    >
      <div className={styles.flip}>
        <Art aim={aim} />
      </div>
    </div>
  );
}

export default MascotSprite;
