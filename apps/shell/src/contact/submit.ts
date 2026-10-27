import type { ActionFunctionArgs } from 'react-router';
import type { ApiError } from '../api/client.ts';
import { sendContactMessage } from '../api/contact.ts';
import { localeFromPath } from '../i18n/locales.ts';
import { clearDraft } from './draft.ts';
import {
  CONTACT_FIELDS,
  type ContactResult,
  type ContactValues,
  type FieldErrorCode,
  type FieldErrors,
} from './model.ts';
import { hasErrors, validateContact } from './validation.ts';

/**
 * The full-stack Contact action's work (contact/action.ts loads this module only in a full-stack
 * build): the values are checked again, then sent through the typed client, and the answer
 * becomes a ContactResult. Nothing is retried: a failure is shown, and sending again is the
 * visitor's choice.
 */
export async function submitContact({ request }: ActionFunctionArgs): Promise<ContactResult> {
  const form = await request.formData();
  const values = Object.fromEntries(
    CONTACT_FIELDS.map((field) => [field, text(form.get(field))]),
  ) as ContactValues;

  const errors = validateContact(values);
  if (hasErrors(errors)) return { status: 'invalid', errors };

  try {
    await sendContactMessage(
      {
        ...values,
        locale: localeFromPath(new URL(request.url).pathname),
        website: text(form.get('website')),
      },
      { signal: request.signal },
    );
  } catch (error) {
    return failure(error as ApiError);
  }
  clearDraft();
  return { status: 'sent' };
}

function failure(error: ApiError): ContactResult {
  // A cancelled request is React Router's to handle (it ignores the result).
  if (error.code === 'aborted') throw error;
  if (error.code === 'network') return { status: 'network' };
  if (error.code === 'rate_limited')
    return { status: 'rate_limited', retryAfter: error.retryAfter };
  if (error.code === 'validation_failed') {
    const errors = fieldErrors(error.details);
    if (hasErrors(errors)) return { status: 'invalid', errors };
  }
  return { status: 'unavailable' };
}

const CODES: readonly FieldErrorCode[] = ['blank', 'too_short', 'too_long', 'invalid'];

/** The first known code for each form field; anything else (e.g. `locale`) is ignored. */
function fieldErrors(details: Record<string, unknown>): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of CONTACT_FIELDS) {
    const codes = details[field];
    const code = Array.isArray(codes) ? CODES.find((known) => codes.includes(known)) : undefined;
    if (code) errors[field] = code;
  }
  return errors;
}

function text(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value : '';
}
