import { describe, expect, it } from 'vitest';
import type { ContactValues, FieldErrors } from './model.ts';
import { hasErrors, length, normalizeContact, validateContact } from './validation.ts';

const valid: ContactValues = {
  name: 'Ada',
  email: 'ada@example.com',
  message: 'Hello there!',
};

// Each case's expected codes were produced by the Rails model itself (ContactMessage#valid? in
// services/api, taking each field's first code in the order blank, too_short, too_long,
// invalid), so these tests pin the client to the API's rules. Re-check them against Rails when
// app/models/contact_message.rb changes.
const cases: [string, Partial<ContactValues>, FieldErrors][] = [
  ['valid values', {}, {}],
  ['a name of spaces', { name: '   ' }, { name: 'blank' }],
  ['a name of no-break spaces', { name: '  ' }, { name: 'blank' }],
  ['a control character in the name', { name: 'A\u0007da' }, { name: 'invalid' }],
  ['U+0085 in the name (whitespace, squished)', { name: 'A\u0085da' }, {}],
  ['a zero-width space in the name (not Cc)', { name: 'A​da' }, {}],
  ['a trailing NUL in the name (stripped)', { name: 'Ada\u0000' }, {}],
  ['inner and outer spaces in the name', { name: '  Ada   Lovelace  ' }, {}],
  ['a 100-character name', { name: 'a'.repeat(100) }, {}],
  ['a 101-character name', { name: 'a'.repeat(101) }, { name: 'too_long' }],
  ['100 emoji as a name (counted as characters)', { name: '😀'.repeat(100) }, {}],
  ['no email', { email: '' }, { email: 'blank' }],
  ['a dotless domain', { email: 'a@b' }, {}],
  ['two dots in a row', { email: 'a@b..c' }, { email: 'invalid' }],
  ['an email with spaces around and capitals', { email: '  ADA@Example.COM  ' }, {}],
  ['an email with a trailing newline', { email: 'ada@example.com\n' }, {}],
  ['a space inside the email', { email: 'ada@exa mple.com' }, { email: 'invalid' }],
  ['a domain starting with a hyphen', { email: 'ada@-example.com' }, { email: 'invalid' }],
  ['non-ASCII letters in the email', { email: 'çà@example.com' }, { email: 'invalid' }],
  ['a 254-character email', { email: `${'a'.repeat(242)}@example.com` }, {}],
  ['a 255-character email', { email: `${'a'.repeat(243)}@example.com` }, { email: 'too_long' }],
  ['a 5-character message', { message: 'short' }, { message: 'too_short' }],
  ['a 9-character message', { message: '123456789' }, { message: 'too_short' }],
  ['a 10-character message', { message: '1234567890' }, {}],
  ['a 10-character message with spaces around', { message: '   1234567890   ' }, {}],
  ['10 emoji as a message', { message: '😀'.repeat(10) }, {}],
  ['9 emoji as a message', { message: '😀'.repeat(9) }, { message: 'too_short' }],
  ['a 5000-character message', { message: 'm'.repeat(5000) }, {}],
  ['a 5001-character message', { message: 'm'.repeat(5001) }, { message: 'too_long' }],
  ['CRLF and tabs in the message', { message: 'line one\r\nline two\tok' }, {}],
  ['a control character in the message', { message: 'bell \u0007 here' }, { message: 'invalid' }],
  ['U+0085 in the message (allowed)', { message: 'next line \u0085 is fine here' }, {}],
  ['CRLFs around a short message', { message: '\r\n\r\n12345678\r\n' }, { message: 'too_short' }],
  [
    'everything empty',
    { name: '', email: '', message: '' },
    { name: 'blank', email: 'blank', message: 'blank' },
  ],
];

describe('validateContact (mirrors the Rails ContactMessage rules)', () => {
  it.each(cases)('%s', (_label, change, expected) => {
    expect(validateContact({ ...valid, ...change })).toEqual(expected);
  });

  it('reports too_long before invalid, as the API orders its codes', () => {
    expect(validateContact({ ...valid, name: `${'a'.repeat(100)}\u0007` })).toEqual({
      name: 'too_long',
    });
  });
});

describe('normalizeContact', () => {
  it('normalises like the API: squished name, lowercased email, trimmed LF message', () => {
    expect(
      normalizeContact({
        name: '  Ada   Lovelace ',
        email: ' ADA@Example.com ',
        message: '  Hi\r\nthere  ',
      }),
    ).toEqual({ name: 'Ada Lovelace', email: 'ada@example.com', message: 'Hi\nthere' });
  });
});

describe('helpers', () => {
  it('counts characters as Ruby does (code points, not UTF-16 units)', () => {
    expect(length('😀a')).toBe(2);
  });

  it('knows whether any field has an error', () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ email: 'invalid' })).toBe(true);
  });
});
