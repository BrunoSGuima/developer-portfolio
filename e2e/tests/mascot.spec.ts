import { expect, type Page, test } from '@playwright/test';
import { homeScene, overlaps } from '../support/geometry.ts';
import { clickLanguage, clickNav, mainNav, open, waitForStableLayout } from '../support/shell.ts';
import { languageOf, LOCALES, localizePath, pageOf } from '../support/site.ts';

const walker = (page: Page) => page.locator('[data-mascot="header"] > div');

/** Records every pose the header mascot takes from now on. */
async function recordPoses(page: Page) {
  await page.evaluate(() => {
    const target = document.querySelector('[data-mascot="header"] > div')!;
    const poses: string[] = [];
    (window as unknown as { __poses: string[] }).__poses = poses;
    new MutationObserver(() => poses.push(target.getAttribute('data-pose') ?? '')).observe(target, {
      attributes: true,
      attributeFilter: ['data-pose'],
    });
  });
  return () => page.evaluate(() => (window as unknown as { __poses: string[] }).__poses);
}

/** Horizontal distance between the mascot's centre and the active nav link's centre. */
function offsetFromActiveLink(page: Page) {
  return page.evaluate(() => {
    const mascot = document.querySelector('[data-mascot="header"] > div')!.getBoundingClientRect();
    const link = document
      .querySelector('[data-nav="main"] a[aria-current="page"]')!
      .getBoundingClientRect();
    return Math.abs(mascot.left + mascot.width / 2 - (link.left + link.width / 2));
  });
}

test.describe('navigation mascot (desktop)', () => {
  test.skip(({ isMobile }) => isMobile, 'the walking mascot is shown from 48rem');
  test.use({ reducedMotion: 'no-preference' });

  test('walks to the new section, points at the Fun Fact, then rests above the link', async ({
    page,
  }) => {
    await open(page, '/');
    await expect(walker(page)).toHaveAttribute('data-pose', 'idle');
    const poses = await recordPoses(page);

    await clickNav(page, pageOf('architecture', 'en').label);

    // Right after the click the mascot is still idle: wait for the walk to finish and rest.
    await expect.poll(async () => (await poses()).at(-1), { timeout: 10_000 }).toBe('idle');
    const seen = (await poses()).filter((pose, i, all) => pose !== all[i - 1]);
    expect(seen).toEqual(['walking', 'pointing', 'idle']);
    expect(await offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
  });

  test('snaps to the moved link without walking when the language changes', async ({ page }) => {
    await open(page, pageOf('about', 'en').path);
    await expect(walker(page)).toHaveAttribute('data-pose', 'idle');
    const poses = await recordPoses(page);

    await clickLanguage(page, languageOf('pt-BR').linkName);
    await expect(page.locator('main h1')).toHaveText(pageOf('about', 'pt-BR').heading);

    await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
    expect(await poses()).not.toContain('walking');
  });

  test('never covers or blocks a nav link', async ({ page }) => {
    await open(page, '/');
    await expect(page.locator('[data-mascot="header"]')).toHaveCSS('pointer-events', 'none');
    for (const link of await mainNav(page).getByRole('link').all()) {
      const hit = await link.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return top === element || element.contains(top);
      });
      expect(hit).toBe(true);
    }
  });
});

test.describe('navigation mascot with reduced motion', () => {
  test.skip(({ isMobile }) => isMobile, 'the walking mascot is shown from 48rem');

  test('moves to the new section without ever walking', async ({ page }) => {
    await open(page, '/');
    const poses = await recordPoses(page);

    await clickNav(page, pageOf('contact', 'en').label);

    await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
    expect(await poses()).not.toContain('walking');
  });
});

test.describe('Fun Fact mascot', () => {
  for (const locale of LOCALES) {
    for (const id of ['home', 'about', 'projects', 'architecture', 'contact']) {
      test(`${pageOf(id, locale).path}: nothing covers the Fun Fact's text or badges`, async ({
        page,
      }) => {
        await open(page, pageOf(id, locale).path);
        const covered = await page.evaluate(() => {
          const card = document.querySelector('[data-fun-fact]')!;
          const misses: string[] = [];
          const walk = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
          for (let node = walk.nextNode(); node; node = walk.nextNode()) {
            if (!node.textContent?.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const rect of range.getClientRects()) {
              for (const x of [rect.left + 2, rect.left + rect.width / 2, rect.right - 2]) {
                const top = document.elementFromPoint(x, rect.top + rect.height / 2);
                if (top && !card.contains(top)) {
                  misses.push(
                    `"${node.textContent.trim().slice(0, 20)}" under <${top.tagName.toLowerCase()}>`,
                  );
                }
              }
            }
          }
          return [...new Set(misses)];
        });
        expect(covered).toEqual([]);
      });
    }
  }

  for (const locale of LOCALES) {
    for (const width of [1024, 1280, 1440, 1920, 2560]) {
      test(`Home ${width}px (${locale}): the fingertip stays under the card, nothing overlaps`, async ({
        page,
        isMobile,
      }) => {
        test.skip(isMobile, 'desktop composition');
        await page.setViewportSize({ width, height: 900 });
        await open(page, localizePath('/', locale));
        // The stage's measured height (useHeroExtent) can move "What I do" a frame or two after
        // the first render, notably with the taller full-stack Fun Fact: measure the settled page.
        await waitForStableLayout(page);
        const scene = await homeScene(page);
        expect(scene).not.toBeNull();
        const { card, fingertip, figure, heading, cards, heroText } = scene!;

        // Just below the card's bottom edge (visible), within its width.
        expect(fingertip.y).toBeGreaterThanOrEqual(card.bottom - 1);
        expect(fingertip.y - card.bottom).toBeLessThanOrEqual(60);
        expect(fingertip.x).toBeGreaterThan(card.left);
        expect(fingertip.x).toBeLessThan(card.right);
        // The mascot never covers the hero text, the "What I do" heading or its cards.
        expect(overlaps(figure, heading)).toBe(false);
        expect(overlaps(figure, cards)).toBe(false);
        for (const text of heroText) expect(overlaps(figure, text)).toBe(false);
      });
    }
  }
});
