import { describe, expect, it } from 'vitest';
import { PHONE_PATTERN } from '../test/privacy.ts';
import { allContent } from './index.ts';

describe('content privacy', () => {
  it('the pattern catches phone-like text but not dates or counts', () => {
    expect(PHONE_PATTERN.test('+00 11 22222-3333')).toBe(true);
    expect(PHONE_PATTERN.test('1234 5678')).toBe(true);
    expect(PHONE_PATTERN.test('2008 – 2013')).toBe(false);
    expect(PHONE_PATTERN.test('about 5,000 applicants')).toBe(false);
  });

  it('contains no phone number anywhere in the site content', () => {
    expect(JSON.stringify(allContent)).not.toMatch(PHONE_PATTERN);
  });
});
