import type { Localized } from '../../i18n/localized.ts';
import type { BadgeTone } from '../../sections/technologies.ts';

export interface MascotFact {
  /** The one page it belongs to. */
  sectionId: string;
  title: Localized<string>;
  text: Localized<string>;
  tags: readonly { label: Localized<string>; tone: BadgeTone }[];
}

const same = (value: string): Localized<string> => ({ en: value, 'pt-BR': value });

/**
 * Facts about the 3D mascot itself, true only in the 3D experience: see PageFunFact.tsx. Each replaces one
 * page's own fact there, and shows nowhere else. funFacts.test.ts checks the numbers against the model. Provenance:
 * the character's own README.
 */
export const mascotFacts: readonly MascotFact[] = [
  {
    sectionId: 'about',
    title: { en: 'Meet My 3D Mascot!', 'pt-BR': 'Conheça meu mascote 3D!' },
    text: {
      en: 'This little character started as a 2D illustration and became a 3D model with Tripo AI. He was refined and rigged in Blender and animated with custom scripts, and Three.js brings him to life as he explores the navigation menu!',
      'pt-BR':
        'Este personagenzinho começou como uma ilustração 2D e virou um modelo 3D com o Tripo AI. Ele foi refinado e ganhou um esqueleto no Blender, foi animado com scripts próprios, e o Three.js lhe dá vida enquanto ele explora o menu de navegação!',
    },
    tags: [
      { label: same('Tripo AI'), tone: 'slate' },
      { label: same('Blender'), tone: 'slate' },
      { label: same('Three.js'), tone: 'slate' },
      { label: same('React'), tone: 'blue' },
    ],
  },
  {
    sectionId: 'architecture',
    title: {
      en: 'Small Character, Real Animations',
      'pt-BR': 'Personagem pequeno, animações de verdade',
    },
    text: {
      en: 'My mascot has a custom 22-bone skeleton and seven animation clips, including walking, running, jumping, sitting and pointing with either arm. The optimized 3D asset, model and texture together, is only about 225 KB!',
      'pt-BR':
        'Meu mascote tem um esqueleto próprio de 22 ossos e sete animações, entre elas caminhar, correr, pular, sentar e apontar com qualquer um dos braços. O modelo 3D otimizado, com a textura, tem apenas cerca de 225 KB!',
    },
    tags: [
      { label: { en: '3D Animation', 'pt-BR': 'Animação 3D' }, tone: 'slate' },
      { label: same('Rigging'), tone: 'slate' },
      { label: { en: 'Performance', 'pt-BR': 'Desempenho' }, tone: 'green' },
    ],
  },
];

/** The fact that replaces a page's own in the 3D experience. Most pages have none. */
export const mascotFactFor = (sectionId: string | undefined): MascotFact | null =>
  mascotFacts.find((fact) => fact.sectionId === sectionId) ?? null;
