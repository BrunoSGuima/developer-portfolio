import styles from './FunFactMascot.module.css';
import MascotSprite from './MascotSprite.tsx';
import { useReducedMotion } from './useMediaQuery.ts';

interface FunFactMascotProps {
  /** The active section; the pop-up replays only when this changes (not on sub-paths). */
  sectionId: string | undefined;
  /**
   * 'back': the whole figure, behind the card. 'front': the same image clipped to the fingertips
   * below the ledge, drawn over the card so the hands appear to grip its top edge.
   */
  layer: 'back' | 'front';
}

/**
 * The Fun Fact mascot peeking over the card (docs/assets/funfact.png), drawn from the approved A5
 * illustration. Stationary, no timers: on each section change the figure is re-created (keyed by
 * section), replaying a short CSS pop-up; both layers share the key, so they move together.
 * FunFactStage decides where it sits. Decorative only.
 */
function FunFactMascot({ sectionId, layer }: FunFactMascotProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className={styles.mascot}
      aria-hidden="true"
      {...(layer === 'back' ? { 'data-mascot': 'fun-fact' } : { 'data-mascot-layer': 'front' })}
      data-pose="peeking"
      data-layer={layer}
      data-motion={reducedMotion ? 'reduced' : 'full'}
    >
      <div key={sectionId ?? 'none'} className={styles.pop} data-pop="">
        <MascotSprite pose="peeking" facing="right" aim="forward" />
      </div>
    </div>
  );
}

export default FunFactMascot;
