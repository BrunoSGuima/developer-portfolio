import { CONTACT_FIELDS, type ContactValues, type FieldErrors } from './model.ts';

/**
 * The client-side checks, a mirror of the API's ContactMessage model
 * (services/api/app/models/contact_message.rb): the same normalisation, then the same rules and
 * codes, so the form rejects exactly what the API would. Lengths count characters (code points),
 * as Ruby does, not UTF-16 units. The API remains the authority; this only saves a round trip.
 */

export const NAME_MAX = 100;
export const EMAIL_MAX = 254;
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 5000;

// Ruby's String#strip: ASCII whitespace and NUL at either end.
const RUBY_STRIP = /^[\0\t\n\v\f\r ]+|[\0\t\n\v\f\r ]+$/g;
// Ruby's [[:space:]] (blank?, squish) is Unicode White_Space.
const BLANK = /^\p{White_Space}*$/u;
const SPACES = /\p{White_Space}+/gu;
// Ruby's [[:cntrl:]] on a Unicode string matches the Cc category only.
const CONTROL = /\p{Cc}/u;
// Control characters other than newline and tab (ContactMessage::MESSAGE_FORBIDDEN).
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const MESSAGE_FORBIDDEN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
// URI::MailTo::EMAIL_REGEXP (Ruby 4.0), with \A…\z as ^…$ (no multiline flag).
const EMAIL =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** The values as the API stores them (its `normalizes` rules). */
export function normalizeContact({ name, email, message }: ContactValues): ContactValues {
  return {
    name: name.replace(SPACES, ' ').replace(RUBY_STRIP, ''),
    email: email.replace(RUBY_STRIP, '').toLowerCase(),
    message: message.replaceAll('\r\n', '\n').replace(RUBY_STRIP, ''),
  };
}

/** The first error for each invalid field, by the API's rules; empty when the values are valid. */
export function validateContact(values: ContactValues): FieldErrors {
  const { name, email, message } = normalizeContact(values);
  const errors: FieldErrors = {};

  if (BLANK.test(name)) errors.name = 'blank';
  else if (length(name) > NAME_MAX) errors.name = 'too_long';
  else if (CONTROL.test(name)) errors.name = 'invalid';

  if (BLANK.test(email)) errors.email = 'blank';
  else if (length(email) > EMAIL_MAX) errors.email = 'too_long';
  else if (!EMAIL.test(email)) errors.email = 'invalid';

  if (BLANK.test(message)) errors.message = 'blank';
  else if (length(message) < MESSAGE_MIN) errors.message = 'too_short';
  else if (length(message) > MESSAGE_MAX) errors.message = 'too_long';
  else if (MESSAGE_FORBIDDEN.test(message)) errors.message = 'invalid';

  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return CONTACT_FIELDS.some((field) => errors[field] !== undefined);
}

/** Characters as Ruby counts them (code points). */
export function length(text: string): number {
  return [...text].length;
}
