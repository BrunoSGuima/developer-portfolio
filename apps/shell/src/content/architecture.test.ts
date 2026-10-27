import { describe, expect, it } from 'vitest';
import { APP_MODES } from '../config/mode.ts';
import { isPlaceholderArt } from '../mascot/assets.ts';
import RemoteSection from '../microfrontends/RemoteSection.tsx';
import { LOCALES } from '../i18n/locales.ts';
import { remoteMount, sectionInMode, sections } from '../sections/registry.ts';
import { components, timeline } from './architecture.ts';

function componentById(id: string) {
  const component = components.find((item) => item.id === id);
  if (!component) throw new Error(`Unknown architecture component: ${id}`);
  return component;
}

function milestoneById(id: string) {
  const milestone = timeline.find((item) => item.id === id);
  if (!milestone) throw new Error(`Unknown milestone: ${id}`);
  return milestone;
}

const finished = (id: string) => milestoneById(id).status === 'done';

// The Architecture page must not claim anything that isn't built.
describe('architecture truthfulness', () => {
  it('"How it\'s built today" lists only implemented (live) components', () => {
    expect(components.every((component) => component.status === 'live')).toBe(true);
  });

  it('only marks the Vue.js milestone done if a section is built with Vue', () => {
    const usesVue = sections.some((section) => section.framework === 'vue');
    expect(finished('vue-microfrontend')).toBe(usesVue);
  });

  // The Rails API (Phase 2) is finished on its own acceptance criteria; the site only uses it
  // once the integration (Phase 3) is done. Sections use Rails only in a full-stack build
  // (ADR-0014), so each rule is checked for the sections as built in each mode.
  // Milestones describe the project, so they're the same in both builds (a static build says,
  // in its timeline note, that it doesn't use the API): the integration is done only while some
  // section is Rails-backed in the full-stack build.
  it('marks the integration done only while the full-stack build has a Rails-backed section', () => {
    const integrated = sections.some(
      (section) => sectionInMode(section, 'fullstack').backend === 'rails',
    );
    expect(finished('integration')).toBe(integrated);
  });

  it.each(APP_MODES)(
    'never has a Rails-backed section in a %s build before the Rails API milestone is done',
    (mode) => {
      if (sections.some((section) => sectionInMode(section, mode).backend === 'rails')) {
        expect(finished('rails-api')).toBe(true);
        expect(milestoneById('integration').status).not.toBe('planned');
      }
    },
  );

  it('only marks the FastAPI milestone done if a section is backed by FastAPI', () => {
    const usesFastApi = sections.some((section) => section.backend === 'fastapi');
    expect(finished('fastapi-service')).toBe(usesFastApi);
  });

  it('only lists internationalisation while the site has more than one language', () => {
    expect(components.some((component) => component.id === 'internationalisation')).toBe(
      LOCALES.length > 1,
    );
  });

  it('only shows the microfrontend host if the host and remote mounts exist', () => {
    if (components.some((component) => component.id === 'microfrontend-host')) {
      expect(RemoteSection).toBeTypeOf('function');
      expect(remoteMount('/apps/example/entry.js').kind).toBe('remote');
    }
  });

  it('says, in both languages, that no real remote section is mounted while none is', () => {
    const anyRemote = sections.some((section) => section.mount.kind === 'remote');
    if (!anyRemote) {
      const { description } = componentById('microfrontend-host');
      expect(description.en).toMatch(/no real remote section is mounted yet/);
      expect(description['pt-BR']).toMatch(/nenhuma seção remota real está montada ainda/);
    }
  });

  it('says, in both languages, that the navigation mascot is still a placeholder', () => {
    if (isPlaceholderArt) {
      const { description } = componentById('mascot');
      expect(description.en).toMatch(/navigation mascot.*placeholder/i);
      expect(description['pt-BR']).toMatch(/navegação.*provisória/i);
    }
  });
});

describe('architecture timeline', () => {
  it('lists finished milestones first, then at most one in progress, then planned ones', () => {
    const rank = { done: 0, live: 0, 'in-progress': 1, planned: 2 } as const;
    const ranks = timeline.map((milestone) => rank[milestone.status]);

    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(timeline.filter((milestone) => milestone.status === 'in-progress').length).toBeLessThan(
      2,
    );
    // A finished milestone is "done", never "live": the site isn't deployed yet (roadmap Phase 4).
    expect(timeline.some((milestone) => milestone.status === 'live')).toBe(false);
  });

  // End of Phase 3: the API (v2) and the integration (v3, the MVP) are done; deployment is next.
  it('shows the Rails API and the integration done, and deployment not started', () => {
    expect(milestoneById('rails-api').status).toBe('done');
    expect(milestoneById('integration').status).toBe('done');
    expect(milestoneById('deployment').status).toBe('planned');
  });

  it('deploys only after the Rails API and the frontend/backend integration', () => {
    const at = (id: string) => timeline.indexOf(milestoneById(id));

    expect(at('rails-api')).toBeLessThan(at('integration'));
    expect(at('integration')).toBeLessThan(at('deployment'));
    expect(finished('deployment')).toBe(false);
  });

  it('places the MVP at the integration: no earlier milestone is called the MVP', () => {
    const integration = timeline.indexOf(milestoneById('integration'));

    for (const milestone of timeline.slice(0, integration)) {
      for (const locale of LOCALES) expect(milestone.name[locale]).not.toMatch(/MVP/);
    }
    for (const locale of LOCALES) {
      expect(milestoneById('integration').name[locale]).toMatch(/MVP/);
    }
  });
});
