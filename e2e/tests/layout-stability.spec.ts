import { expect, test } from '@playwright/test';
import { e2eMode } from '../support/mode.ts';
import { LOCALES, localizePath } from '../support/site.ts';

// Step 4.0: from 64rem the Home "What I do" section sits below a spacer sized to the Fun Fact
// stage, which useHeroExtent measures before the first paint (--home-stage-block). Under
// prefers-reduced-motion, a global non-zero transition-duration once turned that measured change
// into a transition, so the first frames were painted with the fallback height and the section
// jumped down a moment later (full-stack builds, whose Fun Fact makes the stage taller). These
// checks target that defect, not every layout shift: the separate font-swap reflow can still move
// text a little while Inter loads (see docs/ROADMAP.md, Step 4.0). They compare the spacer with
// the value the hook measured, not with the stage's live height, which the font can change for
// a moment before the hook's next measurement (in the same frame, before paint).
test.skip(({ isMobile }) => isMobile, 'the measured stage exists from 64rem (desktop widths)');

/** --space-3 (0.75rem at the default root font size), added to the measured height by the spacer. */
const SPACE_3 = 12;

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  for (const locale of LOCALES) {
    for (const width of [1024, 1280, 1440]) {
      test(`Home ${width}px (${locale}, motion ${reducedMotion}, ${e2eMode}): the spacer applies the measured stage height from the first frame`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ reducedMotion });
        await page.addInitScript(() => {
          const probe = window as unknown as {
            __firstFrame?: { spacer: number; measured: number };
            __downShifts: number[];
          };
          probe.__downShifts = [];
          // Layout shifts that move "What I do" down: what the late spacer did.
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as unknown as {
              sources: { node?: Node; previousRect: DOMRect; currentRect: DOMRect }[];
            }[]) {
              for (const source of entry.sources) {
                const moved = source.currentRect.y - source.previousRect.y;
                if ((source.node as Element | undefined)?.id === 'what-i-do' && moved > 1) {
                  probe.__downShifts.push(Math.round(moved));
                }
              }
            }
          }).observe({ type: 'layout-shift', buffered: true });
          // The first animation frame in which the section exists: what is painted first.
          const tick = () => {
            const heading = document.querySelector('#what-i-do');
            const grid = heading?.closest('section')?.parentElement;
            const measured = document
              .querySelector<HTMLElement>('[data-slot="hero-region"]')
              ?.style.getPropertyValue('--home-stage-block');
            if (heading && grid && measured) {
              probe.__firstFrame = {
                spacer: parseFloat(getComputedStyle(grid, '::before').height),
                measured: parseFloat(measured),
              };
              return;
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });

        await page.goto(localizePath('/', locale));
        await expect(page.locator('#what-i-do')).toBeVisible();
        // Long enough for the font and images to load, which used to trigger the late jump.
        await page.waitForTimeout(1000);

        const { firstFrame, downShifts } = await page.evaluate(() => {
          const probe = window as unknown as {
            __firstFrame?: { spacer: number; measured: number };
            __downShifts: number[];
          };
          return { firstFrame: probe.__firstFrame, downShifts: probe.__downShifts };
        });
        expect(
          firstFrame,
          'the measured Home section was seen in an animation frame',
        ).toBeDefined();
        expect(firstFrame!.spacer - firstFrame!.measured).toBeGreaterThan(SPACE_3 - 1);
        expect(firstFrame!.spacer - firstFrame!.measured).toBeLessThan(SPACE_3 + 1);
        expect(downShifts, '"What I do" moved down after the first paint').toEqual([]);
      });
    }
  }
}
