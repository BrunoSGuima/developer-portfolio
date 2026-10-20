import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { components, timeline } from '../../content/architecture.ts';
import { renderPage } from '../../test/renderPage.tsx';
import page from '../Page.module.css';
import archCss from './ArchitecturePage.module.css?raw';
import styles from './ArchitecturePage.module.css';
import ArchitecturePage from './ArchitecturePage.tsx';

const STATUS_WORD = /^(Live|In progress|Planned)$/;

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

  it('orders the built components so cards side by side have similar heights', () => {
    renderPage(ArchitecturePage);

    const region = screen.getByRole('region', { name: "How it's built today" });
    const names = within(region)
      .getAllByRole('heading', { level: 3 })
      .slice(0, 6)
      .map((heading) => heading.textContent);
    expect(names).toEqual([
      'React shell',
      'Section registry',
      'Mascot guide',
      'Microfrontend host',
      'Static hosting',
      'Client-side routing',
    ]);
  });

  it('marks the mascot as live, noting the navigation mascot is still a placeholder', () => {
    renderPage(ArchitecturePage);

    const mascot = screen.getByRole('heading', { level: 3, name: 'Mascot guide' }).closest('li');
    expect(mascot).toHaveTextContent('Live');
    expect(mascot).toHaveTextContent(/placeholder/i);
  });

  it('shows the evolution timeline in order, each milestone with a status word', () => {
    renderPage(ArchitecturePage);

    const region = screen.getByRole('region', { name: 'How it will evolve' });
    const items = within(region).getAllByRole('listitem');
    expect(items).toHaveLength(timeline.length);
    items.forEach((item, index) => {
      expect(item).toHaveTextContent(timeline[index]!.version);
      expect(item).toHaveTextContent(timeline[index]!.name);
      expect(within(item).getByText(STATUS_WORD)).toBeInTheDocument();
    });
    expect(items[0]).toHaveTextContent('In progress');
  });

  it('keeps "How it\'s built today" in the intro column; later sections are full width', () => {
    const { container } = renderPage(ArchitecturePage);
    const intro = container.querySelector('[data-slot="page-intro"]')!;
    const body = container.querySelector('[data-slot="page-body"]')!;

    expect(intro).toContainElement(screen.getByRole('heading', { level: 1, name: 'Architecture' }));
    expect(intro).toHaveTextContent(/learning project/);
    expect(intro).toContainElement(screen.getByRole('region', { name: "How it's built today" }));
    for (const name of ['How it will evolve', 'Key decisions']) {
      expect(body).toContainElement(screen.getByRole('region', { name }));
    }
  });

  it('sizes every list by its own space: cards up to 3 columns (≥ 20rem), timeline, decisions', () => {
    renderPage(ArchitecturePage);
    // jsdom can't lay out: check the classes and the per-list settings (the grid itself is
    // covered in Page.test.ts and was verified in a real browser).
    const listIn = (name: string) => within(screen.getByRole('region', { name })).getByRole('list');

    expect(listIn("How it's built today")).toHaveClass(page.cardGridFit!, styles.builtToday!);
    expect(listIn('How it will evolve')).toHaveClass(page.cardGridFit!, styles.timeline!);
    expect(listIn('Key decisions')).toHaveClass(page.cardGridFit!, styles.decisions!);
    expect(archCss).toMatch(/\.builtToday\s*\{[^}]*--grid-min:\s*20rem;[^}]*--grid-cols:\s*3;/);
    expect(archCss).toMatch(/\.decisions\s*\{[^}]*--grid-max:\s*var\(--measure\)/);
  });

  it('lists the key architecture decisions', () => {
    renderPage(ArchitecturePage);

    const region = screen.getByRole('region', { name: 'Key decisions' });
    expect(within(region).getAllByRole('listitem')).toHaveLength(4);
  });
});
