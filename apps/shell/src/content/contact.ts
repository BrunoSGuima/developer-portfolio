import { profile } from './profile.ts';

// Public channels only (already public on the résumé). Never add a phone number.

export interface ContactChannel {
  label: string;
  /** Text shown to the visitor. */
  display: string;
  href: string;
}

export const contact = {
  lead: "I'm open to Full-Stack Software Engineer roles working with Ruby on Rails and React or Vue.js. The best way to reach me is by email or LinkedIn.",
  channels: [
    {
      label: 'Email',
      display: 'bruno.soares.guimaraes@gmail.com',
      href: 'mailto:bruno.soares.guimaraes@gmail.com',
    },
    {
      label: 'LinkedIn',
      display: 'linkedin.com/in/bruno-sguimaraes',
      href: 'https://www.linkedin.com/in/bruno-sguimaraes',
    },
    {
      label: 'GitHub',
      display: 'github.com/BrunoSGuima',
      href: 'https://github.com/BrunoSGuima',
    },
  ] satisfies readonly ContactChannel[],
  location: `${profile.location} (${profile.timeZone})`,
  availability: "I'm open to remote work and time-zone overlap.",
};
