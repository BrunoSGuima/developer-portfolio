import type { Locale } from '../locales.ts';
import { en, type Messages } from './en.ts';
import { ptBR } from './pt-BR.ts';

export type { Messages } from './en.ts';

export const messages: Readonly<Record<Locale, Messages>> = {
  en,
  'pt-BR': ptBR,
};
