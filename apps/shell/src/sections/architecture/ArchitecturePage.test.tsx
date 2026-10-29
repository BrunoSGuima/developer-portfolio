import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ADR_DIRECTORY_URL,
  components,
  decisions,
  runModes,
  timeline,
} from '../../content/architecture.ts';
import { renderPage } from '../../test/renderPage.tsx';
import { renderRoute, ROUTE_WAIT } from '../../test/renderRoute.tsx';
import page from '../Page.module.css';
import archCss from './ArchitecturePage.module.css?raw';
import styles from './ArchitecturePage.module.css';
import ArchitecturePage from './ArchitecturePage.tsx';

const STATUS_WORD = /^(Completed|Live|In progress|Planned)$/;

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

  it('marks the mascot as completed, noting the navigation mascot is still a placeholder', () => {
    renderPage(ArchitecturePage);

    const mascot = screen.getByRole('heading', { level: 3, name: 'Mascot guide' }).closest('li');
    expect(mascot).toHaveTextContent('Completed');
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
    expect(fullStack).toHaveTextContent(
      'Not deployed: kept as a complete, tested demonstration. The public portfolio uses a static build to avoid recurring backend hosting costs.',
    );
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
    expect(items[0]).toHaveTextContent('Completed');
    expect(items[3]).toHaveTextContent(/v4\s*Static site release\s*In progress/);
  });

  it('says, in a static build, that the integration is done but this build does not use it', () => {
    renderPage(ArchitecturePage);

    const region = screen.getByRole('region', { name: 'How it will evolve' });
    expect(region).toHaveTextContent(/Frontend\/backend integration \(MVP\)\s*Completed/);
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

  it('lists the six key decisions in order, with their titles and summaries', () => {
    renderPage(ArchitecturePage);

    const region = screen.getByRole('region', { name: 'Key decisions' });
    const items = within(region).getAllByRole('listitem');
    expect(items.map((item) => item.querySelector('strong')?.textContent)).toEqual([
      'ADR-0001: React SPA as the persistent shell',
      'ADR-0002: Framework-agnostic mount contract',
      'ADR-0006: Responsive layout strategy',
      'ADR-0012: Localised data and an OpenAPI contract',
      'ADR-0014: Frontend data access: static and full-stack modes',
      'ADR-0016: Static-first deployment',
    ]);
    items.forEach((item, index) => expect(item).toHaveTextContent(decisions[index]!.summary.en));
    for (const id of [
      '0003',
      '0004',
      '0005',
      '0007',
      '0008',
      '0009',
      '0010',
      '0011',
      '0013',
      '0015',
      '0017',
    ]) {
      expect(region).not.toHaveTextContent(`ADR-${id}`);
    }
  });

  it('links every decision on GitHub below the cards, in a new tab', () => {
    renderPage(ArchitecturePage);

    const region = screen.getByRole('region', { name: 'Key decisions' });
    const link = within(region).getByRole('link', {
      name: 'Explore all architecture decisions on GitHub (opens in a new tab)',
    });
    expect(link).toHaveAttribute('href', ADR_DIRECTORY_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    // Below the cards, centred.
    const list = within(region).getByRole('list');
    expect(list.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(link.parentElement).toHaveClass(styles.allDecisions!);
    expect(archCss).toMatch(/\.allDecisions\s*\{[^}]*max-width:\s*none;[^}]*text-align:\s*center;/);
  });

  it('shows the GitHub link and the full-stack note in Portuguese', async () => {
    renderRoute('/pt-br/architecture');

    const region = await screen.findByRole('region', { name: 'Principais decisões' }, ROUTE_WAIT);
    const link = within(region).getByRole('link', {
      name: 'Explore todas as decisões de arquitetura no GitHub (abre em uma nova aba)',
    });
    expect(link).toHaveAttribute('href', ADR_DIRECTORY_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(region).getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByRole('region', { name: 'Duas formas de executar' })).toHaveTextContent(
      'Sem deploy: mantido como uma demonstração completa e testada. O portfólio público usa um build estático para evitar custos recorrentes de hospedagem do back-end.',
    );
  });
});
