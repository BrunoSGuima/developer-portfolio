import { expect, type Page, test } from '@playwright/test';
import { homeScene, overlaps } from '../support/geometry.ts';
import { horizontalOverflow, open } from '../support/shell.ts';
import { LAYOUT_WIDTHS, LOCALES, pagesIn } from '../support/site.ts';

// Each test sets its own viewport (with the desktop project's real scrollbars).
test.skip(({ isMobile }) => isMobile, 'widths are set explicitly');

/** The header holds together: one row of nav links, the language switcher clear of them. */
function headerLayout(page: Page) {
  return page.evaluate(() => {
    const box = (element: Element | null) => element?.getBoundingClientRect() ?? null;
    const visible = (element: Element) => (element as HTMLElement).offsetParent !== null;
    const links = [...document.querySelectorAll('[data-nav="main"] a')].filter(visible);
    const tops = links.map((link) => Math.round(link.getBoundingClientRect().top));
    const switcher = [...document.querySelectorAll('header nav:not([data-nav])')].find(visible);
    return {
      navRows: new Set(tops).size,
      linksShown: links.length,
      container: box(document.querySelector('header .container'))?.width ?? 0,
      switcher: switcher ? box(switcher) : null,
      brand: box(document.querySelector('header a')),
      nav: box(document.querySelector('[data-nav="main"]')),
    };
  });
}

for (const width of LAYOUT_WIDTHS) {
  for (const locale of LOCALES) {
    test(`${width}px (${locale}): no horizontal scroll, header and cards hold together`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });

      for (const section of pagesIn(locale)) {
        await open(page, section.path);
        expect(await horizontalOverflow(page), `${section.path} scrolls sideways`).toBe(0);

        const header = await headerLayout(page);
        expect(header.container).toBeLessThanOrEqual(1536); // --content-max caps at 96rem
        if (width >= 768) {
          expect(header.linksShown).toBeGreaterThan(0);
          expect(header.navRows, 'nav links on one row').toBe(1);
          expect(header.switcher, 'language switcher in the header').not.toBeNull();
          expect(overlaps(header.switcher!, header.brand!)).toBe(false);
          expect(overlaps(header.switcher!, header.nav!)).toBe(false);
        }

        if (section.id === 'projects') {
          // A single project never stretches across a wide column (Step 8: ≤ 32rem).
          for (const card of await page.locator('main article').all()) {
            expect((await card.boundingBox())!.width).toBeLessThanOrEqual(512.5);
          }
        }

        if (section.id === 'home' && width >= 1024) {
          // The Fun Fact card sits 40px left of the third "What I do" card (Step 8's nudge).
          const scene = await homeScene(page);
          expect(scene!.card.left - scene!.thirdCard.left).toBeCloseTo(-40, 0);
        }
      }
    });
  }
}
