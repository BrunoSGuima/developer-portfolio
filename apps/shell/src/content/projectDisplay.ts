import type { Localized } from '../i18n/localized.ts';

export interface ProjectDisplay {
  category: Localized<string>;
  statusLabel: Localized<string>;
}

/**
 * Wording only the card shows, by project id, whichever source the project came from: the API
 * stores neither (its status stays `in-progress`). A project without an entry shows the usual status
 * word and no category.
 */
export const projectDisplay: Readonly<Record<string, ProjectDisplay>> = {
  'easy-tv-app': {
    category: { en: 'Mobile Application', 'pt-BR': 'Aplicativo móvel' },
    statusLabel: { en: 'In Development', 'pt-BR': 'Em desenvolvimento' },
  },
};
