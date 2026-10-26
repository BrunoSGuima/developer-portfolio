import { expect, test } from '@playwright/test';
import { toProject } from '../../apps/shell/src/api/projects.ts';
import type { ApiProjectList } from '../../apps/shell/src/api/types.ts';
import { projects as staticProjects } from '../../apps/shell/src/content/projects.ts';
import { e2eMode } from '../support/mode.ts';
import { clickLanguage } from '../support/shell.ts';
import { languageOf, messages } from '../support/site.ts';

const PROJECTS_API = '**/api/v1/projects';

// The same cards in both modes: from the static data (static build) or the API (full-stack).
test.describe(`the Projects page (${e2eMode} build)`, () => {
  for (const [path, name] of [
    ['/projects', 'Developer Portfolio (this site)'],
    ['/pt-br/projects', 'Portfólio de Desenvolvedor (este site)'],
  ] as const) {
    test(`shows the portfolio project at ${path}`, async ({ page }) => {
      await page.goto(path);

      const card = page.getByRole('article', { name });
      await expect(card).toBeVisible();
      await expect(card.getByRole('link', { name: /GitHub/ })).toHaveAttribute(
        'href',
        'https://github.com/BrunoSGuima',
      );
      await expect(page.getByRole('alert')).toHaveCount(0);
    });
  }
});

test.describe('the Projects page, full-stack only', () => {
  test.skip(e2eMode !== 'fullstack', 'Uses the API, which exists only in full-stack runs.');

  // The API's seeded projects and the static data are the same content: compared after
  // normalising both to the shell's Project model (raw field names differ by design).
  test('serves the same projects as the static data, once normalised', async ({ request }) => {
    const response = await request.get('/api/v1/projects');
    expect(response.status()).toBe(200);

    const { data } = (await response.json()) as ApiProjectList;

    expect(data.map(toProject)).toEqual(staticProjects);
  });

  test('shows an accessible error, never the static projects, when the API fails; Try again recovers', async ({
    page,
  }) => {
    await page.route(PROJECTS_API, (route) =>
      route.fulfill({
        status: 500,
        json: { error: { code: 'internal_error', message: 'Internal Server Error', details: {} } },
      }),
    );

    await page.goto('/projects');

    const alert = page.getByRole('alert');
    await expect(alert).toContainText(messages.en.projects.error);
    await expect(page.getByRole('article')).toHaveCount(0);

    await page.unroute(PROJECTS_API);
    await alert.getByRole('button', { name: messages.en.projects.retry }).click();

    await expect(
      page.getByRole('article', { name: 'Developer Portfolio (this site)' }),
    ).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('shows an accessible loading state while the API answers', async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route(PROJECTS_API, async (route) => {
      await held;
      await route.continue();
    });

    await page.goto('/projects');

    await expect(page.getByRole('status')).toContainText(messages.en.projects.loading);
    release();
    await expect(page.getByRole('article')).toBeVisible();
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('reuses the projects when switching language (no new request within 5 minutes)', async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/projects')) requests.push(request.url());
    });

    await page.goto('/projects');
    await expect(page.getByRole('article')).toBeVisible();
    await clickLanguage(page, languageOf('pt-BR').linkName);
    await expect(
      page.getByRole('article', { name: 'Portfólio de Desenvolvedor (este site)' }),
    ).toBeVisible();

    expect(requests).toHaveLength(1);
  });
});
