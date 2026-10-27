import type { ActionFunctionArgs } from 'react-router';
import { isFullStack } from '../config/mode.ts';
import type { ContactResult } from './model.ts';

/**
 * The Contact route's action (ADR-0014), which the form submits to through a fetcher:
 *
 * - static: there is no form and no API client; a submission is refused (the route's error).
 * - full-stack: contact/submit.ts checks the values again and sends them through the typed
 *   client. It is loaded only here and only in a full-stack build.
 */

// The literal comparison (the same one as config/mode.ts) must stay at the import site, so a
// static build drops the import and emits none of the form's code or the contact client
// (static-mode E2E checks).
const loadSubmit = () =>
  import.meta.env.VITE_APP_MODE === 'fullstack'
    ? import('./submit.ts')
    : Promise.reject(new Error('A static build has no API client (VITE_APP_MODE=static).'));

export async function apiContactAction(args: ActionFunctionArgs): Promise<ContactResult> {
  const { submitContact } = await loadSubmit();
  return submitContact(args);
}

export function staticContactAction(): never {
  throw new Error('This build of the site has no contact form (VITE_APP_MODE=static).');
}

export const contactAction = isFullStack ? apiContactAction : staticContactAction;
