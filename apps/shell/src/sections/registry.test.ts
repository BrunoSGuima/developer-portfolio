import { describe, expect, it } from 'vitest';
import { getSection, liveSections, sections } from './registry.ts';

describe('section registry', () => {
  it('has unique ids and paths', () => {
    const ids = sections.map((section) => section.id);
    const paths = sections.map((section) => section.path);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('uses absolute paths, with exactly one home section at "/"', () => {
    for (const section of sections) {
      expect(section.path).toMatch(/^\//);
    }
    expect(sections.filter((section) => section.path === '/')).toHaveLength(1);
  });

  it('gives every section a label and a title', () => {
    for (const section of sections) {
      expect(section.label.trim()).not.toBe('');
      expect(section.title.trim()).not.toBe('');
    }
  });

  it('exposes only live sections, in registry order', () => {
    expect(liveSections.every((section) => section.status === 'live')).toBe(true);
    expect(liveSections).toEqual(sections.filter((section) => section.status === 'live'));
  });

  it('gives every React section a loader for its page component', () => {
    for (const section of sections) {
      if (section.mount.kind === 'react') {
        expect(section.mount.load).toBeTypeOf('function');
      }
    }
  });

  it('looks sections up by id', () => {
    expect(getSection('about')?.path).toBe('/about');
    expect(getSection('does-not-exist')).toBeUndefined();
  });
});
