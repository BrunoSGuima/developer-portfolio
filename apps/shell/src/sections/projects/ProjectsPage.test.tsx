import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderPage } from '../../test/renderPage.tsx';
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

  it('links the portfolio card to the GitHub profile', () => {
    renderPage(ProjectsPage);

    expect(screen.getByRole('link', { name: 'GitHub profile' })).toHaveAttribute(
      'href',
      'https://github.com/BrunoSGuima',
    );
  });
});
