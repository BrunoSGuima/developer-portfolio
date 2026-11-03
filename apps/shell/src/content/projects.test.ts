import { describe, expect, it } from 'vitest';
import { LOCALES } from '../i18n/locales.ts';
import { projectDisplay } from './projectDisplay.ts';
import { projects } from './projects.ts';

// The Projects page (Step 4.7): personal projects only, each public one linked to its own public
// repository, private ones never linked.
const PRIVATE = ['personal-finance-app', 'easy-tv-app'];
const PUBLIC_REPOSITORY = /^https:\/\/github\.com\/BrunoSGuima\/[\w.-]+$/;

describe('projects content', () => {
  it('lists the four projects in display order', () => {
    expect(projects.map((project) => project.id)).toEqual([
      'developer-portfolio',
      'personal-finance-app',
      'easy-tv-app',
      'auction-house',
    ]);
  });

  it('never links a project in a private repository', () => {
    for (const id of PRIVATE) {
      expect(projects.find((project) => project.id === id)?.links).toEqual([]);
    }
  });

  it('links every public project to its own public repository, never the profile or a private one', () => {
    for (const project of projects.filter(({ id }) => !PRIVATE.includes(id))) {
      expect(project.links.length, project.id).toBeGreaterThan(0);
      for (const { href } of project.links) {
        expect(href, project.id).toMatch(PUBLIC_REPOSITORY);
        for (const id of PRIVATE) expect(href).not.toContain(id);
      }
    }
  });

  it('labels each project Completed or In progress, never live or planned', () => {
    expect(projects.map(({ status }) => status)).toEqual([
      'in-progress',
      'in-progress',
      'in-progress',
      'done',
    ]);
  });

  it('keeps descriptions concise (at most 400 characters) and present in every language', () => {
    for (const project of projects) {
      for (const locale of LOCALES) {
        expect(project.description[locale].length, `${project.id} ${locale}`).toBeLessThanOrEqual(
          400,
        );
        expect(project.name[locale].trim()).not.toBe('');
      }
    }
  });

  it('describes the Finance App workflow separately from its stack (badges: Flutter and Dart only)', () => {
    const finance = projects.find(({ id }) => id === 'personal-finance-app')!;
    expect(finance.tech).toEqual(['flutter', 'dart']);
    expect(finance.description.en).toMatch(/Grok Bot and Cursor/);
    expect(finance.description['pt-BR']).toMatch(/Grok Bot e o Cursor/);
  });

  it("keeps the Easy TV App to the owner's wording, with no feature, stack or date beyond it", () => {
    const tv = projects.find(({ id }) => id === 'easy-tv-app')!;
    expect(tv.description.en).toBe(
      'A mobile application currently under development, focused on delivering a simple and accessible user experience. Preparing for a future release on Google Play.',
    );
    expect(tv.description['pt-BR']).toBe(
      'Um aplicativo móvel em desenvolvimento, com foco em oferecer uma experiência simples e acessível. Em preparação para um futuro lançamento no Google Play.',
    );
    expect(tv.tech).toEqual(['mobile-development', 'android', 'product-development']);
    for (const locale of LOCALES) expect(tv.description[locale]).not.toMatch(/\b20\d\d\b/);
  });

  it('gives extra card wording only to projects that exist, and to the Easy TV App alone', () => {
    expect(Object.keys(projectDisplay)).toEqual(['easy-tv-app']);
    expect(projectDisplay['easy-tv-app']).toEqual({
      category: { en: 'Mobile Application', 'pt-BR': 'Aplicativo móvel' },
      statusLabel: { en: 'In Development', 'pt-BR': 'Em desenvolvimento' },
    });
  });
});
