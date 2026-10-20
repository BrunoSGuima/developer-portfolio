import type { Localized } from '../i18n/localized.ts';
import { profile } from './profile.ts';

// Public channels only (already public on the résumé). Never add a phone number.

export interface ContactChannel {
  label: Localized<string>;
  /** Text shown to the visitor. */
  display: string;
  href: string;
}

export const contact = {
  lead: {
    en: "I'm open to Full-Stack Software Engineer roles working with Ruby on Rails and React or Vue.js. The best way to reach me is by email or LinkedIn.",
    'pt-BR':
      'Estou aberto a oportunidades como Engenheiro de Software Full-Stack com Ruby on Rails e React ou Vue.js. A melhor forma de falar comigo é por e-mail ou pelo LinkedIn.',
  } satisfies Localized<string>,
  channels: [
    {
      label: { en: 'Email', 'pt-BR': 'E-mail' },
      display: 'bruno.soares.guimaraes@gmail.com',
      href: 'mailto:bruno.soares.guimaraes@gmail.com',
    },
    {
      label: { en: 'LinkedIn', 'pt-BR': 'LinkedIn' },
      display: 'linkedin.com/in/bruno-sguimaraes',
      href: 'https://www.linkedin.com/in/bruno-sguimaraes',
    },
    {
      label: { en: 'GitHub', 'pt-BR': 'GitHub' },
      display: 'github.com/BrunoSGuima',
      href: 'https://github.com/BrunoSGuima',
    },
  ] satisfies readonly ContactChannel[],
  location: {
    en: `${profile.location.en} (${profile.timeZone})`,
    'pt-BR': `${profile.location['pt-BR']} (${profile.timeZone})`,
  } satisfies Localized<string>,
  availability: {
    en: "I'm open to remote work and time-zone overlap.",
    'pt-BR': 'Estou disponível para trabalho remoto e para sobreposição de fuso horário.',
  } satisfies Localized<string>,
};
