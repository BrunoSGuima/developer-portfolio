import { describe, expect, it } from 'vitest';
import { APP_MODES } from '../config/mode.ts';
import { LOCALES } from '../i18n/locales.ts';
import {
  type Backend,
  type Framework,
  getSection,
  liveSections,
  remoteMount,
  sectionInMode,
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

  it.each(LOCALES)('gives every section a label, a title and a description in %s', (locale) => {
    for (const section of sections) {
      expect(section.label[locale].trim()).not.toBe('');
      expect(section.title[locale].trim()).not.toBe('');
      expect(section.description[locale].trim()).not.toBe('');
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

  it('gives remote sections a same-origin entry and a path other than "/"', () => {
    for (const section of sections) {
      if (section.mount.kind !== 'remote') continue;
      expect(section.mount.entry).toMatch(/^\/(?!\/)/);
      expect(section.path).not.toBe('/');
    }
  });

  it('builds a remote mount from an entry URL', () => {
    const mount = remoteMount('/apps/career/entry.js');

    expect(mount).toMatchObject({ kind: 'remote', entry: '/apps/career/entry.js' });
    expect(mount.load).toBeTypeOf('function');
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

// Each rule holds for every section as built in each mode (static and full-stack, ADR-0014).
const inEveryMode = (list: readonly (typeof sections)[number][]) =>
  APP_MODES.flatMap((mode) =>
    list.map((section) => [`${section.id} (${mode})`, sectionInMode(section, mode)] as const),
  );

describe('Fun Fact truthfulness', () => {
  it.each(inEveryMode(liveSections))(
    '%s has Fun Fact text in every language and at least one live badge',
    (_id, section) => {
      for (const locale of LOCALES) expect(section.funFact.text[locale].trim()).not.toBe('');
      expect(section.funFact.tech.length).toBeGreaterThan(0);
    },
  );

  it.each(inEveryMode(sections))('%s lists its own framework as a live badge', (_id, section) => {
    expect(section.funFact.tech).toContain(FRAMEWORK_TECH[section.framework]);
  });

  it.each(inEveryMode(sections))('%s only claims a backend it actually uses', (_id, section) => {
    const liveTech: readonly string[] = section.funFact.tech;
    for (const [backend, tech] of Object.entries(BACKEND_TECH)) {
      expect(liveTech.includes(tech)).toBe(section.backend === backend);
    }
    // PostgreSQL is only ever claimed together with the Rails API that uses it.
    if (liveTech.includes('postgresql')) expect(section.backend).toBe('rails');
  });

  it.each([
    ...inEveryMode(sections).map(([id, section]) => [id, section.funFact] as const),
    ['shell', shellFunFact] as const,
  ])('%s never lists a technology as both live and planned', (_id, funFact) => {
    const live = new Set<string>(funFact.tech);
    for (const tech of funFact.plannedTech ?? []) {
      expect(live.has(tech)).toBe(false);
    }
  });

  it('describes a static build without any backend', () => {
    for (const section of sections) {
      expect(sectionInMode(section, 'static').backend).toBe('none');
    }
  });

  it('describes the full-stack Projects page as backed by the Rails API and PostgreSQL', () => {
    const projects = sectionInMode(getSection('projects')!, 'fullstack');

    expect(projects.backend).toBe('rails');
    expect(projects.funFact.tech).toEqual(['react', 'typescript', 'rails', 'postgresql']);
    expect(projects.funFact.text.en).toMatch(/Ruby on Rails API backed by PostgreSQL/);
  });

  it('describes the full-stack Contact page as sending to the Rails API, and the static one as formless', () => {
    const contact = getSection('contact')!;

    expect(sectionInMode(contact, 'static').funFact.text.en).toMatch(/^No contact form here/);
    const fullstack = sectionInMode(contact, 'fullstack');
    expect(fullstack.backend).toBe('rails');
    expect(fullstack.funFact.tech).toEqual(['react', 'typescript', 'rails', 'postgresql']);
    expect(fullstack.funFact.text.en).toMatch(/Ruby on Rails API/);
    expect(contact.action).toBeTypeOf('function');
  });
});

describe('sectionInMode', () => {
  it('returns the section unchanged in a static build', () => {
    const projects = getSection('projects')!;

    expect(sectionInMode(projects, 'static')).toBe(projects);
  });

  it('applies only the full-stack overrides', () => {
    const projects = getSection('projects')!;
    const resolved = sectionInMode(projects, 'fullstack');

    expect(resolved).toEqual({ ...projects, ...projects.fullstack });
    expect(resolved.path).toBe(projects.path);
    expect(resolved.mount).toBe(projects.mount);
  });

  it('leaves sections without overrides as they are', () => {
    const about = getSection('about')!;

    expect(sectionInMode(about, 'fullstack')).toBe(about);
  });
});

describe('Fun Fact placement per page', () => {
  it('uses only the allowed placements', () => {
    for (const section of sections) {
      expect([undefined, 'stacked', 'aside', 'intro']).toContain(section.contextPlacement);
    }
  });

  it('puts the Fun Fact in a side column on About and Contact only (for now)', () => {
    const aside = sections.filter((section) => section.contextPlacement === 'aside');

    expect(aside.map((section) => section.id).sort()).toEqual(['about', 'contact']);
  });

  it('puts the Fun Fact beside the intro on Projects and Architecture', () => {
    const intro = sections.filter((section) => section.contextPlacement === 'intro');

    expect(intro.map((section) => section.id).sort()).toEqual(['architecture', 'projects']);
  });
});
