import { getIllustration } from './art/illustrations.ts';
import styles from './HomeBackdrop.module.css';

/**
 * Home only: ONE continuous illustrated background (A1 desktop / A2 mobile) spanning the whole
 * hero, behind the text and the Fun Fact scene, plus a cream scrim that keeps the hero text
 * readable. Its height follows the real hero (AppLayout measures it). Decorative only.
 */
function HomeBackdrop() {
  const desktop = getIllustration('heroDesktop');
  const mobile = getIllustration('heroMobile');

  return (
    <div className={styles.backdrop} aria-hidden="true" data-slot="backdrop">
      <picture>
        <source
          media="(max-width: 47.99rem)"
          srcSet={mobile.srcSet}
          sizes="100vw"
          width={mobile.width}
          height={mobile.height}
        />
        <img
          className={styles.image}
          src={desktop.src}
          srcSet={desktop.srcSet}
          sizes="100vw"
          width={desktop.width}
          height={desktop.height}
          alt=""
          fetchPriority="high"
          data-illustration="heroDesktop"
        />
      </picture>
      <div className={styles.scrim} data-slot="scrim" />
    </div>
  );
}

export default HomeBackdrop;
