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

  it('has exactly one milestone in progress, with nothing live after it', () => {
    const current = timeline.findIndex((milestone) => milestone.status === 'in-progress');

    expect(timeline.filter((milestone) => milestone.status === 'in-progress')).toHaveLength(1);
    expect(timeline.slice(current + 1).some((milestone) => milestone.status === 'live')).toBe(
      false,
    );
  });
});
