import { getIllustration, type IllustrationKey } from './illustrations.ts';
import styles from './IllustrationArt.module.css';

function IllustrationImage({ name, sizes }: { name: IllustrationKey; sizes: string }) {
  const image = getIllustration(name);
  return (
    <img
      className={styles.image}
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt=""
      decoding="async"
      draggable={false}
      data-illustration={name}
    />
  );
}

/** A3: the Home mascot, full body, pointing up-right at the Fun Fact card. */
export function PresentingImage() {
  return <IllustrationImage name="mascotPresenting" sizes="(min-width: 64rem) 26rem, 12rem" />;
}

/** A5: the Fun Fact mascot peeking over the card, hands on its top edge. */
export function PeekingImage() {
  return <IllustrationImage name="mascotPeeking" sizes="13rem" />;
}
