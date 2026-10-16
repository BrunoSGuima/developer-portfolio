import { components, decisions, timeline } from './architecture.ts';
import { contact } from './contact.ts';
import { education } from './education.ts';
import { experience } from './experience.ts';
import {
  about,
  developingSkills,
  home,
  languages,
  professionalSkills,
  profile,
} from './profile.ts';
import { projects } from './projects.ts';

/** Every content module, for whole-site checks (pending placeholders, privacy). */
export const allContent = {
  profile,
  home,
  about,
  professionalSkills,
  developingSkills,
  languages,
  experience,
  education,
  projects,
  architecture: { components, timeline, decisions },
  contact,
};
