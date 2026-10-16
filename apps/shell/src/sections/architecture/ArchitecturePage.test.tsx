import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { components, timeline } from '../../content/architecture.ts';
import { renderPage } from '../../test/renderPage.tsx';
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

  it('marks the mascot as planned', () => {
    renderPage(ArchitecturePage);

    const mascot = screen.getByRole('heading', { level: 3, name: 'Mascot guide' }).closest('li');
    expect(mascot).toHaveTextContent('Planned');
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

  it('lists the key architecture decisions', () => {
    renderPage(ArchitecturePage);

    const region = screen.getByRole('region', { name: 'Key decisions' });
    expect(within(region).getAllByRole('listitem')).toHaveLength(4);
  });
});
