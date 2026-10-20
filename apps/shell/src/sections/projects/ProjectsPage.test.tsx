import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderPage } from '../../test/renderPage.tsx';
import page from '../Page.module.css';
import projectsCss from './ProjectsPage.module.css?raw';
import styles from './ProjectsPage.module.css';
import ProjectsPage from './ProjectsPage.tsx';

describe('ProjectsPage', () => {
  it('shows only the Developer Portfolio project for now', () => {
    renderPage(ProjectsPage);

    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveAccessibleName('Developer Portfolio (this site)');
  });

  it('explains why professional work is not listed, linking to About', () => {
    renderPage(ProjectsPage);

    expect(screen.getByText(/private client codebases/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
  });

  it('keeps the cards in the intro column, directly after the lead (no full-width body)', () => {
    const { container } = renderPage(ProjectsPage);
    const intro = container.querySelector('[data-slot="page-intro"]')!;

    expect(intro).toContainElement(screen.getByRole('heading', { level: 1, name: 'Projects' }));
    expect(intro).toHaveTextContent(/private client codebases/);
    expect(intro).toContainElement(screen.getByRole('article'));
    expect(container.querySelector('[data-slot="page-body"]')).toBeNull();
  });

  it('links the portfolio card to the GitHub profile', () => {
    renderPage(ProjectsPage);

    expect(screen.getByRole('link', { name: 'GitHub profile' })).toHaveAttribute(
      'href',
      'https://github.com/BrunoSGuima',
    );
  });

  it('keeps project cards at a reasonable width however wide the column is', () => {
    const { container } = renderPage(ProjectsPage);
    const list = container.querySelector('[data-slot="page-intro"] > ul');

    expect(list).toHaveClass(page.cardGridFit!, styles.cards!);
    expect(projectsCss).toMatch(
      /\.cards\s*\{[^}]*--grid-min:\s*20rem;[^}]*--grid-cols:\s*2;[^}]*--grid-max:\s*32rem;/,
    );
  });
});
