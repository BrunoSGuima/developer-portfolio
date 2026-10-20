import { describe, expect, it } from 'vitest';
import { isPlaceholderArt } from '../mascot/assets.ts';
import RemoteSection from '../microfrontends/RemoteSection.tsx';
import { remoteMount, sections } from '../sections/registry.ts';
import { components, timeline } from './architecture.ts';

function componentById(id: string) {
  const component = components.find((item) => item.id === id);
  if (!component) throw new Error(`Unknown architecture component: ${id}`);
  return component;
}

const statusOf = (id: string) => componentById(id).status;

// The Architecture page must not call something live that no section actually uses.
describe('architecture truthfulness', () => {
  it('only shows the Vue.js microfrontend as live if a section is built with Vue', () => {
    const usesVue = sections.some((section) => section.framework === 'vue');
    expect(statusOf('vue-microfrontend') === 'live').toBe(usesVue);
  });

  it('only shows the Rails API as live if a section is backed by Rails', () => {
    const usesRails = sections.some((section) => section.backend === 'rails');
    expect(statusOf('rails-api') === 'live').toBe(usesRails);
  });

  it('only shows the FastAPI service as live if a section is backed by FastAPI', () => {
    const usesFastApi = sections.some((section) => section.backend === 'fastapi');
    expect(statusOf('fastapi-service') === 'live').toBe(usesFastApi);
  });

  it('only shows the microfrontend host as live if the host and remote mounts exist', () => {
    if (statusOf('microfrontend-host') === 'live') {
      expect(RemoteSection).toBeTypeOf('function');
      expect(remoteMount('/apps/example/entry.js').kind).toBe('remote');
    }
  });

  it('says no real remote section is mounted while no section uses one', () => {
    const anyRemote = sections.some((section) => section.mount.kind === 'remote');
    if (!anyRemote) {
      expect(componentById('microfrontend-host').description).toMatch(
        /no real remote section is mounted yet/,
      );
    }
  });

  it('says the navigation mascot is a placeholder while its art is the placeholder', () => {
    if (isPlaceholderArt) {
      expect(componentById('mascot').description).toMatch(/navigation mascot.*placeholder/i);
    }
  });

  it('has exactly one milestone in progress, with nothing live after it', () => {
    const current = timeline.findIndex((milestone) => milestone.status === 'in-progress');

    expect(timeline.filter((milestone) => milestone.status === 'in-progress')).toHaveLength(1);
    expect(timeline.slice(current + 1).some((milestone) => milestone.status === 'live')).toBe(
      false,
    );
  });
});
