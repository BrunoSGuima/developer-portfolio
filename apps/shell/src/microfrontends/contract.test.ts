import { describe, expect, it } from 'vitest';
import { isSectionApp } from './contract.ts';

describe('isSectionApp', () => {
  it('accepts a module exporting mount() and unmount()', () => {
    expect(isSectionApp({ mount: () => undefined, unmount: () => undefined })).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'module'],
    ['a module without unmount', { mount: () => undefined }],
    ['a module without mount', { unmount: () => undefined }],
    ['non-function exports', { mount: 'mount', unmount: 'unmount' }],
  ])('rejects %s', (_label, candidate) => {
    expect(isSectionApp(candidate)).toBe(false);
  });
});
