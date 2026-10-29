import { useState } from 'react';
import { type Theme } from '../theme/theme.ts';
import { useTheme } from '../theme/useTheme.ts';
import { getIllustration, type IllustrationKey } from './art/illustrations.ts';
import styles from './HomeBackdrop.module.css';

/** The approved day and night paintings of the office (A1/A2, A1N/A2N; ART-BRIEF §8–9). */
const ART: Record<Theme, { desktop: IllustrationKey; mobile: IllustrationKey }> = {
  light: { desktop: 'heroDesktop', mobile: 'heroMobile' },
  dark: { desktop: 'heroDesktopNight', mobile: 'heroMobileNight' },
};

interface LayerProps {
  theme: Theme;
  active: boolean;
  onLoad: () => void;
}

/** One theme's painting: A2-style art on small screens, A1-style otherwise, never stretched. */
function Layer({ theme, active, onLoad }: LayerProps) {
  const desktop = getIllustration(ART[theme].desktop);
  const mobile = getIllustration(ART[theme].mobile);

  return (
    <picture className={styles.layer} data-backdrop-theme={theme} data-active={active}>
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
        data-illustration={ART[theme].desktop}
        onLoad={onLoad}
      />
    </picture>
  );
}

/**
 * Home only: ONE continuous illustrated background spanning the whole hero, behind the text and
 * the Fun Fact scene, plus a scrim that keeps the hero text readable. Its height follows the real
 * hero (AppLayout measures it). Decorative only.
 *
 * The painting follows the theme (ADR-0017): the day office in light, the same office at night in
 * dark. Only the current theme's painting is requested at first (theme-init.js has set the theme
 * before this renders). After a switch, the other painting is shown once it has loaded, and
 * crossfades in (CSS; instant under reduced motion). Both stay mounted, so switching back is
 * instant. The backdrop's size never depends on the image, so nothing moves.
 */
function HomeBackdrop() {
  const theme = useTheme();
  const [loaded, setLoaded] = useState<ReadonlySet<Theme>>(() => new Set([theme]));
  // The current theme's painting once it has loaded; until then, the one already showing.
  const shown: Theme = loaded.has(theme) ? theme : theme === 'dark' ? 'light' : 'dark';
  const layers = (['light', 'dark'] as const).filter((t) => t === theme || loaded.has(t));

  return (
    <div className={styles.backdrop} aria-hidden="true" data-slot="backdrop">
      <div className={styles.layers}>
        {layers.map((t) => (
          <Layer
            key={t}
            theme={t}
            active={t === shown}
            onLoad={() =>
              setLoaded((current) => (current.has(t) ? current : new Set([...current, t])))
            }
          />
        ))}
      </div>
      <div className={styles.scrim} data-slot="scrim" />
    </div>
  );
}

export default HomeBackdrop;
