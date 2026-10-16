import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderPage } from '../../test/renderPage.tsx';
import HomePage from './HomePage.tsx';

describe('HomePage', () => {
  it('introduces Bruno as a full-stack engineer', () => {
    renderPage(HomePage);

    expect(screen.getByRole('heading', { level: 1, name: "Hi, I'm Bruno." })).toBeInTheDocument();
    expect(screen.getByText(/full-stack software engineer/i)).toBeInTheDocument();
  });

  it('links to Projects and About from the call-to-action buttons', () => {
    renderPage(HomePage);

    expect(screen.getByRole('link', { name: /view projects/i })).toHaveAttribute(
      'href',
      '/projects',
    );
    expect(screen.getByRole('link', { name: 'About Me' })).toHaveAttribute('href', '/about');
  });

  it('has the What I do, Now learning and site sections', () => {
    renderPage(HomePage);

    for (const name of ['What I do', 'Now learning', 'This site is a project, too']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
    expect(screen.getByRole('link', { name: /explore the architecture/i })).toHaveAttribute(
      'href',
      '/architecture',
    );
  });

  it('presents Python as something being learned, not professional experience', () => {
    renderPage(HomePage);

    const learning = screen.getByRole('region', { name: 'Now learning' });
    expect(learning).toHaveTextContent(/Python/);
    expect(screen.getByRole('region', { name: 'What I do' })).not.toHaveTextContent(/Python/);
  });
});
