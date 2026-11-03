import { expect, test } from '@playwright/test';
import { toProject } from '../../apps/shell/src/api/projects.ts';
import type { ApiProjectList } from '../../apps/shell/src/api/types.ts';
import { projectDisplay } from '../../apps/shell/src/content/projectDisplay.ts';
import { projects as staticProjects } from '../../apps/shell/src/content/projects.ts';
import { technologies } from '../../apps/shell/src/sections/technologies.ts';
import { e2eMode } from '../support/mode.ts';
import { clickLanguage } from '../support/shell.ts';
import { languageOf, messages } from '../support/site.ts';

const PROJECTS_API = '**/api/v1/projects';

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The same cards in both modes: from the static data (static build) or the API (full-stack).
test.describe(`the Projects page (${e2eMode} build)`, () => {
  for (const locale of ['en', 'pt-BR'] as const) {
    const path = locale === 'en' ? '/projects' : '/pt-br/projects';

    test(`shows the projects in order at ${path}, each linked only where public`, async ({
      page,
    }) => {
      await page.goto(path);

      const cards = page.getByRole('article');
      await expect(cards).toHaveText(
        staticProjects.map(({ name }) => new RegExp(escape(name[locale]))),
      );
      for (const project of staticProjects) {
        const card = page.getByRole('article', { name: project.name[locale] });
        await expect(card.getByRole('link')).toHaveCount(project.links.length);
        for (const link of project.links) {
          await expect(card.getByRole('link', { name: link.label[locale] })).toHaveAttribute(
            'href',
            link.href as string, // never a placeholder: the content gate forbids them in CI
          );
        }
      }
      await expect(page.getByRole('alert')).toHaveCount(0);
    });

    test(`shows the Easy TV App's full wording, with no link or image, at ${path}`, async ({
      page,
    }) => {
      const display = projectDisplay['easy-tv-app']!;
      await page.goto(path);

      const card = page.getByRole('article', { name: 'Easy TV App' });
      await expect(card).toContainText(display.statusLabel[locale]);
      await expect(card).toContainText(display.category[locale]);
      for (const tech of ['mobile-development', 'android', 'product-development'] as const) {
        const { label } = technologies[tech];
        await expect(card).toContainText(typeof label === 'string' ? label : label[locale]);
      }
      await expect(card.locator('a, img')).toHaveCount(0);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    // Cards in one grid row share the tallest one's height (never a page-wide height), with the
    // title and description at the top and the tags and links at the bottom.
    test(`gives cards in a row one height, tags at the bottom, at ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('article')).toHaveCount(staticProjects.length);

      const cards = await page.getByRole('article').evaluateAll((articles) =>
        articles.map((article) => {
          const box = article.getBoundingClientRect();
          const style = getComputedStyle(article);
          const last = article.lastElementChild!.getBoundingClientRect();
          const description = article.querySelector(':scope > p:not([class])')!;
          const above = description.previousElementSibling!.getBoundingClientRect();
          return {
            top: Math.round(box.top),
            height: box.height,
            bottomGap: box.bottom - parseFloat(style.paddingBlockEnd) - last.bottom,
            // The free space never goes above the description: it follows its header by the
            // card's ordinary gap.
            descriptionGap:
              description.getBoundingClientRect().top - above.bottom - parseFloat(style.rowGap),
          };
        }),
      );

      const rows = new Map<number, typeof cards>();
      for (const card of cards) rows.set(card.top, [...(rows.get(card.top) ?? []), card]);
      for (const row of rows.values()) {
        const tallest = Math.max(...row.map((card) => card.height));
        for (const card of row) expect(card.height).toBeCloseTo(tallest, 0);
      }
      for (const card of cards) {
        expect(card.bottomGap).toBeCloseTo(0, 0);
        expect(card.descriptionGap).toBeCloseTo(0, 0);
      }
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
    await expect(page.getByRole('article')).toHaveCount(staticProjects.length);
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
    await expect(page.getByRole('article')).toHaveCount(staticProjects.length);
    await clickLanguage(page, languageOf('pt-BR').linkName);
    await expect(
      page.getByRole('article', { name: 'Portfólio de Desenvolvedor (este site)' }),
    ).toBeVisible();

    expect(requests).toHaveLength(1);
  });
});
