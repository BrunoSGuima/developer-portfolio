import { type ReactElement, useRef } from 'react';
import './mascot3d.css';
import { useMascotDirector } from './useMascotDirector.ts';

export interface Mascot3DHostProps {
  sectionId: string | undefined;
  locale: string;
}

/** Stays mounted across routes, so the character is one instance. Decorative only. */
function Mascot3DHost({ sectionId, locale }: Mascot3DHostProps): ReactElement | null {
  const overlay = useRef<HTMLDivElement>(null);
  useMascotDirector(overlay, sectionId, locale);
  return <div ref={overlay} className="mascot3d" aria-hidden="true" data-mascot3d="overlay" />;
}

export default Mascot3DHost;
