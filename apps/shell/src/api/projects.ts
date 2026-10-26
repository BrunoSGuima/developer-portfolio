import type { Project } from '../projects/model.ts';
import { ApiError, getJson } from './client.ts';
import type { ApiProject, ApiProjectList } from './types.ts';

/**
 * The API source of projects (full-stack mode, ADR-0014): GET /api/v1/projects mapped to the
 * shell's Project model, the same model the static data produces. This module is the only place
 * that sees both the API's types and the model. Pages use it from Step 3.3.
 */
export async function fetchProjects({ signal }: { signal?: AbortSignal } = {}): Promise<
  readonly Project[]
> {
  const body = await getJson<ApiProjectList>('/api/v1/projects', { signal });
  if (!Array.isArray(body.data)) {
    throw new ApiError('invalid_response', 'The API returned an unexpected projects response', {
      status: 200,
    });
  }
  return body.data.map(toProject);
}

export function toProject(project: ApiProject): Project {
  return {
    id: project.slug,
    name: project.name,
    status: project.status,
    description: project.description,
    tech: project.technologies,
    links: project.links.map((link) => ({ label: link.label, href: link.url })),
  };
}
