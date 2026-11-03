import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { pick } from '../../apps/shell/src/i18n/localized.ts';
import { mascotFacts } from '../../apps/shell/src/mascot/three/funFacts.ts';
import type {} from '../../apps/shell/src/mascot/three/useMascotDirector.ts';
import { liveSections, sectionInMode } from '../../apps/shell/src/sections/registry.ts';
import { clickLanguage, clickNav, open } from '../support/shell.ts';
import { languageOf, messages, pageOf, type Locale } from '../support/site.ts';

const PAGES = ['home', 'about', 'projects', 'architecture', 'contact'];
const factOf = (id: string) => mascotFacts.find((fact) => fact.sectionId === id);

// The flagged build is always a static one.
const ownFact = (id: string, locale: Locale) =>
  pick(
    sectionInMode(
      liveSections.find((section) => section.id === id)!,
      'static',
    ).funFact.text,
    locale,
  );

const mascotCard = (page: Page) => page.locator('[data-fun-fact-mascot]');
const factText = (page: Page) => page.locator('[data-fun-fact] p').nth(1);
const html = (page: Page) => page.locator('html');

/** Exactly what this page shows in the 3D experience: its one fixed fact, and no other. */
async function expect3DFact(page: Page, id: string, locale: Locale = 'en') {
  const fact = factOf(id);
  await expect(factText(page)).toHaveText(fact ? fact.text[locale] : ownFact(id, locale));
  if (fact) {
    await expect(mascotCard(page)).toContainText(fact.title[locale]);
    for (const tag of fact.tags) await expect(mascotCard(page)).toContainText(tag.label[locale]);
    for (const other of mascotFacts) {
      if (other !== fact) await expect(mascotCard(page)).not.toContainText(other.title[locale]);
    }
  } else {
    await expect(mascotCard(page)).toHaveCount(0);
  }
}

/** Exactly what the page shows without it: its original fact. */
async function expectOriginal(page: Page, id: string, locale: Locale = 'en') {
  await expect(mascotCard(page)).toHaveCount(0);
  await expect(factText(page)).toHaveText(ownFact(id, locale));
}

async function openActive(page: Page, path: string) {
  await open(page, path);
  await expect(html(page)).toHaveAttribute('data-mascot3d', 'active');
  await page.evaluate(() => window.__mascot3d!.holdTimer());
}

const navTo = async (page: Page, id: string, locale: Locale = 'en') => {
  await clickNav(page, pageOf(id, locale).label);
  await expect(page.locator('main h1')).toHaveText(pageOf(id, locale).heading);
};

test.describe('the 3D experience: one fixed fact per page', () => {
  for (const locale of ['en', 'pt-BR'] as const) {
    for (const id of PAGES) {
      test(`${locale}, ${id}: a direct load and a refresh`, async ({ page }) => {
        await openActive(page, pageOf(id, locale).path);
        await expect3DFact(page, id, locale);
        await page.reload();
        await expect(html(page)).toHaveAttribute('data-mascot3d', 'active');
        await expect3DFact(page, id, locale);
      });
    }

    test(`${locale}: every page keeps its fact, over repeated visits`, async ({ page }) => {
      await openActive(page, pageOf('projects', locale).path);
      const route = [
        'home',
        'about',
        'projects',
        'architecture',
        'contact',
        'about',
        'architecture',
      ];
      for (let round = 0; round < 3; round += 1) {
        for (const id of route) {
          await navTo(page, id, locale);
          await expect3DFact(page, id, locale);
        }
      }
    });
  }

  test('between the two pages with mascot facts, neither shows the other’s', async ({ page }) => {
    await openActive(page, pageOf('about', 'en').path);
    for (let visit = 0; visit < 4; visit += 1) {
      await navTo(page, 'architecture');
      await expect3DFact(page, 'architecture');
      await navTo(page, 'about');
      await expect3DFact(page, 'about');
    }
  });

  test('back and forward', async ({ page }) => {
    await openActive(page, pageOf('about', 'en').path);
    await navTo(page, 'architecture');
    await navTo(page, 'contact');
    for (const [step, id] of [
      [() => page.goBack(), 'architecture'],
      [() => page.goBack(), 'about'],
      [() => page.goForward(), 'architecture'],
      [() => page.goForward(), 'contact'],
      [() => page.goBack(), 'architecture'],
    ] as const) {
      await step();
      await expect(page.locator('main h1')).toHaveText(pageOf(id, 'en').heading);
      await expect3DFact(page, id);
    }
  });

  for (const id of PAGES) {
    test(`${id}: language and theme switches keep the same fact`, async ({ page }) => {
      await openActive(page, pageOf(id, 'en').path);
      const toggle = (locale: Locale) =>
        page.getByRole('button', { name: messages[locale].layout.themeToggle, exact: true });
      await toggle('en').click();
      await expect3DFact(page, id, 'en');
      await clickLanguage(page, languageOf('pt-BR').linkName);
      await expect(page.locator('main h1')).toHaveText(pageOf(id, 'pt-BR').heading);
      await expect3DFact(page, id, 'pt-BR');
      await toggle('pt-BR').click();
      await expect3DFact(page, id, 'pt-BR');
      await clickLanguage(page, languageOf('en').linkName);
      await expect(page.locator('main h1')).toHaveText(pageOf(id, 'en').heading);
      await expect3DFact(page, id, 'en');
    });
  }

  for (const [label, delay] of [
    ['a normal load', 0],
    ['a slow load', 3000],
  ] as const) {
    test(`${label}: the fact is right from the first paint, and never swaps`, async ({ page }) => {
      await page.addInitScript(() => {
        const seen = new Set<string>();
        (window as unknown as { __facts: Set<string> }).__facts = seen;
        (window as unknown as { __shift: number }).__shift = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            (window as unknown as { __shift: number }).__shift += (
              entry as unknown as { value: number }
            ).value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        const tick = () => {
          const text = document.querySelectorAll('[data-fun-fact] p')[1]?.textContent;
          if (text) seen.add(text);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      if (delay) {
        await page.route(/\/bruno-[^/]*\.glb$/, async (route) => {
          await new Promise((done) => setTimeout(done, delay));
          await route.continue();
        });
      }
      await open(page, pageOf('about', 'en').path);
      await expect(html(page)).toHaveAttribute('data-mascot3d', 'active', { timeout: 15_000 });
      await page.waitForTimeout(300);
      const seen = await page.evaluate(() => [
        ...(window as unknown as { __facts: Set<string> }).__facts,
      ]);
      expect(seen).toEqual([factOf('about')!.text.en]);
      expect(
        await page.evaluate(() => (window as unknown as { __shift: number }).__shift),
      ).toBeLessThan(0.01);
    });
  }

  test('the region keeps its name, and axe finds nothing, in both themes', async ({ page }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      await openActive(page, pageOf('about', 'en').path);
      await expect(mascotCard(page)).toBeVisible();
      await expect(
        page.getByRole('complementary', { name: messages.en.funFact.region }),
      ).toBeVisible();
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations).toEqual([]);
    }
  });

  for (const id of ['about', 'architecture'] as const) {
    test(`${id}: he lands on the card, with its fact on it`, async ({ page }) => {
      await openActive(page, pageOf(id, 'en').path);
      await expect
        .poll(() => page.evaluate(() => window.__mascot3d!.state().phase), { timeout: 30_000 })
        .toBe('seated');
      await page.evaluate(() => window.__mascot3d!.jumpNow());
      await expect
        .poll(() => page.evaluate(() => window.__mascot3d!.state().phase), { timeout: 20_000 })
        .toBe('pointing');
      const box = await page.evaluate(() => window.__mascot3d!.pixelBox());
      const top = await mascotCard(page).evaluate((el) => el.getBoundingClientRect().top + scrollY);
      expect(Math.abs(box!.bottom - top)).toBeLessThanOrEqual(3);
      await expect3DFact(page, id);
    });
  }
});

test.describe('without the 3D experience: every original fact', () => {
  for (const [label, block] of [
    ['the model fails to load', /\/bruno-[^/]*\.glb$/],
    ['the texture fails to load', /\/base-[^/]*\.webp$/],
    ['the engine fails to load', /\/engine-[^/]*\.js$/],
  ] as const) {
    test(`${label}`, async ({ page }) => {
      await page.route(block, (route) => route.abort());
      await open(page, pageOf('about', 'en').path);
      await expect(html(page)).toHaveAttribute('data-mascot2d', '', { timeout: 15_000 });
      for (const id of [...PAGES, ...PAGES]) {
        await navTo(page, id);
        await expectOriginal(page, id);
      }
    });
  }

  test('no WebGL', async ({ page }) => {
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = (() => null) as never;
    });
    await open(page, pageOf('architecture', 'en').path);
    await expect(html(page)).toHaveAttribute('data-mascot2d', '', { timeout: 15_000 });
    await expectOriginal(page, 'architecture');
  });

  test('a failure later on returns to the original at once', async ({ page }) => {
    await openActive(page, pageOf('about', 'en').path);
    await expect3DFact(page, 'about');
    await page.evaluate(() => window.__mascot3d!.breakNextFrame());
    await expect(html(page)).toHaveAttribute('data-mascot2d', '', { timeout: 15_000 });
    await expectOriginal(page, 'about');
  });

  for (const locale of ['en', 'pt-BR'] as const) {
    test(`a phone, ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const id of PAGES) {
        await page.goto(pageOf(id, locale).path);
        await expectOriginal(page, id, locale);
      }
    });
  }

  test('crossing the desktop width follows it both ways', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(pageOf('about', 'en').path);
    await expectOriginal(page, 'about');
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect3DFact(page, 'about');
    await page.setViewportSize({ width: 390, height: 844 });
    await expectOriginal(page, 'about');
  });
});
