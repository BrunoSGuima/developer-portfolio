import { describe, expect, it } from 'vitest';
import {
  type Backend,
  type Framework,
  getSection,
  liveSections,
  sections,
  shellFunFact,
} from './registry.ts';

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

// The Fun Fact must never claim more than what is implemented. These rules tie its badges to the
// section's declared framework and backend.
const FRAMEWORK_TECH: Record<Framework, string> = { react: 'react', vue: 'vue' };
const BACKEND_TECH: Record<Exclude<Backend, 'none'>, string> = {
  rails: 'rails',
  fastapi: 'fastapi',
};

describe('Fun Fact truthfulness', () => {
  it.each(liveSections.map((section) => [section.id, section] as const))(
    '%s has Fun Fact text and at least one live badge',
    (_id, section) => {
      expect(section.funFact.text.trim()).not.toBe('');
      expect(section.funFact.tech.length).toBeGreaterThan(0);
    },
  );

  it.each(sections.map((section) => [section.id, section] as const))(
    '%s lists its own framework as a live badge',
    (_id, section) => {
      expect(section.funFact.tech).toContain(FRAMEWORK_TECH[section.framework]);
    },
  );

  it.each(sections.map((section) => [section.id, section] as const))(
    '%s only claims a backend it actually uses',
    (_id, section) => {
      const liveTech: readonly string[] = section.funFact.tech;
      for (const [backend, tech] of Object.entries(BACKEND_TECH)) {
        expect(liveTech.includes(tech)).toBe(section.backend === backend);
      }
    },
  );

  it.each([
    ...sections.map((section) => [section.id, section.funFact] as const),
    ['shell', shellFunFact] as const,
  ])('%s never lists a technology as both live and planned', (_id, funFact) => {
    const live = new Set<string>(funFact.tech);
    for (const tech of funFact.plannedTech ?? []) {
      expect(live.has(tech)).toBe(false);
    }
  });
});
