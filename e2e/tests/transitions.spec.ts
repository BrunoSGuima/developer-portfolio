import { expect, type Page, test } from '@playwright/test';
import {
  clickLanguage,
  clickNav,
  expectShellPersisted,
  markShell,
  open,
} from '../support/shell.ts';
import { languageOf, pageOf } from '../support/site.ts';

/**
 * Records each view transition and the animations it ran (ADR-0008). Installed before the app
 * starts, wrapping the browser's own `startViewTransition`.
 */
async function recordTransitions(page: Page) {
  await page.addInitScript(() => {
    const transitions: { animations: { pseudo: string; ms: number }[] | null }[] = [];
    (window as unknown as { __vt: typeof transitions }).__vt = transitions;
    // Called below with the right `this` (`original.call(this, …)`).
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const original = Document.prototype.startViewTransition;
    if (typeof original !== 'function') return;
    Document.prototype.startViewTransition = function (this: Document, update) {
      const transition = original.call(this, update);
      const entry: (typeof transitions)[number] = { animations: null };
      transitions.push(entry);
      void transition.ready.then(() => {
        entry.animations = document.documentElement
          .getAnimations({ subtree: true })
          .map((animation) => animation.effect as KeyframeEffect | null)
          .filter((effect) => effect?.pseudoElement?.startsWith('::view-transition'))
          .map((effect) => ({
            pseudo: effect!.pseudoElement!,
            ms: Number(effect!.getTiming().duration),
          }));
      });
      return transition;
    } as typeof original;
  });
  return () =>
    page.evaluate(
      () =>
        (window as unknown as { __vt: { animations: { pseudo: string; ms: number }[] | null }[] })
          .__vt,
    );
}

const pt = languageOf('pt-BR');

test.describe('page transitions', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('crossfade only the page region, briefly; the header never animates', async ({ page }) => {
    const transitions = await recordTransitions(page);
    await open(page, '/');
    await markShell(page);

    await clickNav(page, pageOf('about', 'en').label);
    await expect(page.locator('main h1')).toHaveText(pageOf('about', 'en').heading);

    await expect.poll(async () => (await transitions())[0]?.animations).not.toBeNull();
    const [first] = await transitions();
    const animated = new Set(first!.animations!.map((animation) => animation.pseudo));
    expect(animated).toEqual(
      new Set([
        '::view-transition-group(page)',
        '::view-transition-old(page)',
        '::view-transition-new(page)',
      ]),
    );
    for (const { ms } of first!.animations!) {
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThanOrEqual(300);
    }
    await expectShellPersisted(page);
  });

  test('also crossfade language switches and back/forward', async ({ page }) => {
    const transitions = await recordTransitions(page);
    await open(page, pageOf('projects', 'en').path);

    await clickLanguage(page, pt.linkName);
    await expect(page.locator('main h1')).toHaveText(pageOf('projects', 'pt-BR').heading);
    await page.goBack();
    await expect(page.locator('main h1')).toHaveText(pageOf('projects', 'en').heading);
    await page.goForward();
    await expect(page.locator('main h1')).toHaveText(pageOf('projects', 'pt-BR').heading);

    await expect.poll(async () => (await transitions()).length).toBe(3);
  });
});

test.describe('page transitions with reduced motion', () => {
  test('run without any animation', async ({ page }) => {
    const transitions = await recordTransitions(page);
    await open(page, '/');

    await clickNav(page, pageOf('contact', 'en').label);
    await expect(page.locator('main h1')).toHaveText(pageOf('contact', 'en').heading);

    await expect.poll(async () => (await transitions())[0]?.animations).toEqual([]);
  });
});

test.describe('browsers without View Transitions', () => {
  test('navigate instantly, as before', async ({ page }) => {
    await page.addInitScript(() => {
      Reflect.deleteProperty(Document.prototype, 'startViewTransition');
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await open(page, '/');
    await markShell(page);

    await clickNav(page, pageOf('architecture', 'en').label);

    await expect(page.locator('main h1')).toHaveText(pageOf('architecture', 'en').heading);
    await expectShellPersisted(page);
    expect(errors).toEqual([]);
  });
});
