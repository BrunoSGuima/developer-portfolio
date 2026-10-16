import { describe, expect, it } from 'vitest';
import { sections } from '../sections/registry.ts';
import { components, timeline } from './architecture.ts';

function statusOf(id: string) {
  const component = components.find((item) => item.id === id);
  if (!component) throw new Error(`Unknown architecture component: ${id}`);
  return component.status;
}

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

  it('has exactly one milestone in progress, with nothing live after it', () => {
    const current = timeline.findIndex((milestone) => milestone.status === 'in-progress');

    expect(timeline.filter((milestone) => milestone.status === 'in-progress')).toHaveLength(1);
    expect(timeline.slice(current + 1).some((milestone) => milestone.status === 'live')).toBe(
      false,
    );
  });
});
