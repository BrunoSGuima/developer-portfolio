import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import indexHtml from '../../index.html?raw';
import buttonStyles from '../components/ButtonLink/ButtonLink.module.css';
import buttonCss from '../components/ButtonLink/ButtonLink.module.css?raw';
import funFactCss from '../components/FunFact/FunFact.module.css?raw';
import switcherCss from '../components/LanguageSwitcher/LanguageSwitcher.module.css?raw';
import navCss from '../components/Nav/Nav.module.css?raw';
import preferencesCss from '../components/Preferences/Preferences.module.css?raw';
import themeToggleCss from '../components/ThemeToggle/ThemeToggle.module.css?raw';
import globalCss from '../styles/global.css?raw';
import layoutCss from './layout/AppLayout.module.css?raw';
import RouteErrorPage from './pages/RouteErrorPage.tsx';

// jsdom can't run view transitions, media queries or forced colours: these pin the rules
// (the behaviour was verified in Chromium; see ADR-0008).
describe('page transition styles', () => {
  it('names only the region between the header and the footer', () => {
    expect(layoutCss).toMatch(/\.region\s*\{[^}]*view-transition-name:\s*page;/);
    expect(globalCss).toMatch(
      /::view-transition-group\(root\),\s*::view-transition-old\(root\),\s*::view-transition-new\(root\)\s*\{\s*animation:\s*none;/,
    );
  });

  it('crossfades with the motion tokens (instant under reduced motion)', () => {
    expect(globalCss).toMatch(
      /::view-transition-old\(page\)\s*\{[^}]*animation-duration:\s*var\(--duration-fast\)/,
    );
    expect(globalCss).toMatch(
      /::view-transition-new\(page\)\s*\{[^}]*animation-duration:\s*var\(--duration-base\)/,
    );
    const reduced = globalCss.slice(globalCss.lastIndexOf('@media (prefers-reduced-motion'));
    expect(reduced).toMatch(/::view-transition-new\(\*\)\s*\{\s*animation:\s*none !important;/);
  });

  it("doesn't fade the Fun Fact twice while the page crossfades", () => {
    expect(funFactCss).toMatch(
      /:global\(:root:active-view-transition\)\s*\.content\s*\{\s*animation:\s*none;/,
    );
  });
});

/** The body of the first top-level `@media <query> {` block, or '' when there is none. */
function mediaBlock(css: string, query: string): string {
  const start = css.indexOf(`@media ${query} {`);
  return start === -1 ? '' : css.slice(start, css.indexOf('\n}\n', start));
}

describe('touch and pointer styles', () => {
  const controls = {
    button: buttonCss,
    nav: navCss,
    switcher: switcherCss,
    themeToggle: themeToggleCss,
    global: globalCss,
  };

  it.each(Object.entries(controls))(
    'keeps every %s hover style inside (hover: hover), so a tap never leaves it stuck',
    (_name, css) => {
      expect(mediaBlock(css, '(hover: hover)')).toMatch(/:hover/);
      let rest = css;
      for (let block = mediaBlock(rest, '(hover: hover)'); block;) {
        rest = rest.replace(block, '');
        block = mediaBlock(rest, '(hover: hover)');
      }
      expect(rest).not.toMatch(/:hover/);
    },
  );

  it('gives the language links and the theme toggle 44px targets on touch screens', () => {
    expect(mediaBlock(switcherCss, '(pointer: coarse)')).toMatch(
      /min-inline-size:\s*2\.75rem;\s*min-block-size:\s*2\.75rem;/,
    );
    expect(mediaBlock(themeToggleCss, '(pointer: coarse)')).toMatch(
      /inline-size:\s*2\.75rem;\s*block-size:\s*2\.75rem;/,
    );
    // Without padding the pill (44px + borders) still fits the 48–64rem header lane.
    expect(mediaBlock(preferencesCss, '(pointer: coarse)')).toMatch(/padding:\s*0;/);
  });

  it('presses buttons with a transform (never a layout change), not while pending', () => {
    expect(buttonCss).toMatch(
      /\.button:active:not\(\[aria-disabled='true'\]\)\s*\{\s*transform:\s*translateY\(1px\);\s*\}/,
    );
  });

  it('outlines the Menu button and the preferences pill with the ≥ 3:1 control border', () => {
    expect(navCss).toMatch(/\.toggle\s*\{[^}]*border:\s*1px solid var\(--color-control-border\)/);
    expect(preferencesCss).toMatch(
      /\.pill\s*\{[^}]*border:\s*1px solid var\(--color-control-border\)/,
    );
  });
});

describe('polish', () => {
  it('fades the small-screen menu panel in, without movement', () => {
    const small = navCss.slice(navCss.indexOf('@media (max-width: 47.99rem)'));
    expect(small).toMatch(
      /\.panel\[data-open='true'\]\s*\{\s*animation:\s*panel-in var\(--duration-fast\)/,
    );
    const keyframes = navCss.slice(navCss.indexOf('@keyframes panel-in'));
    expect(keyframes).toMatch(/opacity:\s*0;/);
    expect(keyframes.slice(0, keyframes.indexOf('}\n}'))).not.toMatch(/transform/);
  });

  it('marks the current language without colour alone in forced-colours mode', () => {
    const forced = switcherCss.slice(switcherCss.indexOf('@media (forced-colors: active)'));
    expect(forced).toMatch(/\.link\[aria-current='true'\]\s*\{\s*text-decoration:\s*underline;/);
  });

  it("styles the error page's Reload control as the site's primary button", () => {
    render(<RouteErrorPage />);

    const reload = screen.getByRole('button', { name: 'Reload the page' });
    expect(reload).toHaveClass(buttonStyles.button!);
    expect(reload).toHaveAttribute('data-variant', 'primary');
  });

  it('links favicons made from the mascot art, and the theme colour', () => {
    // The PNGs live in public/ (generated by scripts/build-favicon.mjs).
    for (const file of ['favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png']) {
      expect(indexHtml).toContain(`href="/${file}"`);
    }
    expect(indexHtml).toMatch(/<meta name="theme-color" content="#fcf5ed" \/>/);
  });
});
