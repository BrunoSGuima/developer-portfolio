import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { components, decisions, runModes, timeline } from '../../content/architecture.ts';
import { renderPage } from '../../test/renderPage.tsx';
import page from '../Page.module.css';
import archCss from './ArchitecturePage.module.css?raw';
import styles from './ArchitecturePage.module.css';
import ArchitecturePage from './ArchitecturePage.tsx';

const STATUS_WORD = /^(Done|Live|In progress|Planned)$/;

describe('ArchitecturePage', () => {
  it('lists every component with a visible status word', () => {
    renderPage(ArchitecturePage);

    const region = screen.getByRole('region', { name: "How it's built today" });
    const items = within(region).getAllByRole('listitem');
    expect(items).toHaveLength(components.length);
    for (const item of items) {
      expect(within(item).getByText(STATUS_WORD)).toBeInTheDocument();
    }
  });

  it('lists the built components in a technical reading order', () => {
    renderPage(ArchitecturePage);

    const region = screen.getByRole('region', { name: "How it's built today" });
    const names = within(region)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    // Foundations, then cross-cutting features, then quality.
    expect(names).toEqual([
      'React shell',
      'Section registry',
      'Routing and page transitions',
      'Microfrontend host',
      'Two build modes',
      'Internationalisation',
      'Responsive layout',
      'Accessibility',
      'Mascot guide',
      'Automated testing',
      'Continuous integration',
    ]);
  });

  it('marks the mascot as done, noting the navigation mascot is still a placeholder', () => {
    renderPage(ArchitecturePage);

    const mascot = screen.getByRole('heading', { level: 3, name: 'Mascot guide' }).closest('li');
    expect(mascot).toHaveTextContent('Done');
    expect(mascot).toHaveTextContent(/placeholder/i);
  });

  // Nothing is published yet (ADR-0016): no component may say "Live" until Step 4.12.
  it('calls no component live while the site is unpublished', () => {
    renderPage(ArchitecturePage);

    const region = screen.getByRole('region', { name: "How it's built today" });
    expect(within(region).queryByText('Live')).not.toBeInTheDocument();
  });

  it('shows the two ways to run it: the static production build and the local full stack', () => {
    const { container } = renderPage(ArchitecturePage);

    const region = screen.getByRole('region', { name: 'Two ways to run it' });
    const cards = [...container.querySelectorAll<HTMLElement>('[data-run-mode]')];
    expect(cards.map((card) => card.dataset.runMode)).toEqual(['static', 'fullstack']);
    for (const card of cards) expect(region).toContainElement(card);

    const [staticSite, fullStack] = cards as [HTMLElement, HTMLElement];
    expect(within(staticSite).getByRole('heading', { level: 3 })).toHaveTextContent('Static site');
    expect(staticSite).toHaveTextContent('The production build');
    expect(staticSite).toHaveTextContent(/No API, no database and no server/);
    expect(staticSite).toHaveTextContent(/Hosting: Cloudflare Pages\s*Planned/);

    expect(within(fullStack).getByRole('heading', { level: 3 })).toHaveTextContent(
      'Full-stack mode',
    );
    expect(fullStack).toHaveTextContent('Runs locally');
    expect(fullStack).toHaveTextContent(/Ruby on Rails 8 API from PostgreSQL 18/);
    expect(fullStack).toHaveTextContent(/Not deployed/);
    expect(fullStack).not.toHaveTextContent(/Hosting/);
    expect(within(fullStack).getAllByRole('listitem')).toHaveLength(runModes[1]!.points.length);
  });

  it('shows the evolution timeline in order, each milestone with a status word', () => {
    renderPage(ArchitecturePage);

    const region = screen.getByRole('region', { name: 'How it will evolve' });
    const items = within(region).getAllByRole('listitem');
    expect(items).toHaveLength(timeline.length);
    items.forEach((item, index) => {
      expect(item).toHaveTextContent(timeline[index]!.version);
      expect(item).toHaveTextContent(timeline[index]!.name.en);
      expect(within(item).getByText(STATUS_WORD)).toBeInTheDocument();
    });
    expect(items[0]).toHaveTextContent('Done');
    expect(items[3]).toHaveTextContent(/v4\s*Static site release\s*In progress/);
  });

  it('says, in a static build, that the integration is done but this build does not use it', () => {
    renderPage(ArchitecturePage);

    const region = screen.getByRole('region', { name: 'How it will evolve' });
    expect(region).toHaveTextContent(/Frontend\/backend integration \(MVP\)\s*Done/);
    expect(region).toHaveTextContent(
      /its integration with this site \(v3\) are built and tested, and run locally in full-stack mode/,
    );
    expect(region).toHaveTextContent(/runs without the API or a database/);
    expect(region).toHaveTextContent(/The public release \(v4\) will be this static build/);
    expect(region).toHaveTextContent(/provisional/);
  });

  it('keeps "How it\'s built today" in the intro column; later sections are full width', () => {
    const { container } = renderPage(ArchitecturePage);
    const intro = container.querySelector('[data-slot="page-intro"]')!;
    const body = container.querySelector('[data-slot="page-body"]')!;

    expect(intro).toContainElement(screen.getByRole('heading', { level: 1, name: 'Architecture' }));
    expect(intro).toHaveTextContent(/learning project/);
    expect(intro).toContainElement(screen.getByRole('region', { name: "How it's built today" }));
    for (const name of ['Two ways to run it', 'How it will evolve', 'Key decisions']) {
      expect(body).toContainElement(screen.getByRole('region', { name }));
    }
  });

  it('sizes every list by its own space: cards up to 3 columns (≥ 20rem), modes, timeline, decisions', () => {
    renderPage(ArchitecturePage);
    // jsdom can't lay out: check the classes and the per-list settings (the grid itself is
    // covered in Page.test.ts and was verified in a real browser).
    const listIn = (name: string) =>
      within(screen.getByRole('region', { name })).getAllByRole('list')[0];

    expect(listIn("How it's built today")).toHaveClass(page.cardGridFit!, styles.builtToday!);
    expect(listIn('Two ways to run it')).toHaveClass(page.cardGridFit!, styles.modes!);
    expect(listIn('How it will evolve')).toHaveClass(page.cardGridFit!, styles.timeline!);
    expect(listIn('Key decisions')).toHaveClass(page.cardGridFit!, styles.decisions!);
    expect(archCss).toMatch(/\.builtToday\s*\{[^}]*--grid-min:\s*20rem;[^}]*--grid-cols:\s*3;/);
    expect(archCss).toMatch(/\.modes\s*\{[^}]*--grid-min:\s*24rem;/);
    expect(archCss).toMatch(/\.decisions\s*\{[^}]*--grid-max:\s*var\(--measure\)/);
  });

  it('lets a last card alone on a three-column row span it (container query, not viewport)', () => {
    renderPage(ArchitecturePage);

    const region = screen.getByRole('region', { name: "How it's built today" });
    expect(region).toHaveClass(styles.builtTodaySection!);
    expect(archCss).toMatch(/\.builtTodaySection\s*\{\s*container-type:\s*inline-size;/);
    expect(archCss).toMatch(
      /@container \(min-width: 62rem\)\s*\{\s*\.builtToday > li:last-child:nth-child\(3n \+ 1\)\s*\{\s*grid-column:\s*1 \/ -1;/,
    );
  });

  it('lists the key architecture decisions', () => {
    renderPage(ArchitecturePage);

    const region = screen.getByRole('region', { name: 'Key decisions' });
    const items = within(region).getAllByRole('listitem');
    expect(items).toHaveLength(decisions.length);
    expect(decisions.at(-1)?.id).toBe('ADR-0016');
    expect(items.at(-2)).toHaveTextContent(/ADR-0015.*Superseded by ADR-0016/);
    items.forEach((item, index) =>
      expect(item).toHaveTextContent(`ADR-${String(index + 1).padStart(4, '0')}`),
    );
  });
});
