import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderPage } from '../../test/renderPage.tsx';
import HomePage from './HomePage.tsx';
import homeCss from './HomePage.module.css?raw';

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

  it('groups the heading, lead and buttons in the hero, before the other sections', () => {
    const { container } = renderPage(HomePage);
    const hero = container.querySelector<HTMLElement>('[data-slot="hero"]')!;

    expect(hero).toContainElement(screen.getByRole('heading', { level: 1 }));
    expect(hero).toContainElement(screen.getByRole('link', { name: /view projects/i }));
    expect(hero).not.toContainElement(screen.getByRole('region', { name: 'What I do' }));
  });

  it('puts "What I do" in the hero flow, keeping its heading and cards in one region', () => {
    const { container } = renderPage(HomePage);
    const hero = container.querySelector<HTMLElement>('[data-slot="hero"]')!;
    const whatIDo = screen.getByRole('region', { name: 'What I do' });

    expect(hero.parentElement).toContainElement(whatIDo);
    expect(whatIDo).toContainElement(screen.getByRole('heading', { level: 2, name: 'What I do' }));
    expect(within(whatIDo).getAllByRole('listitem')).toHaveLength(3);
  });

  it('lays out the hero and "What I do" structurally, robust to the hero text wrapping', () => {
    // jsdom can't lay out or apply media queries: check the desktop rules. The hero has no fixed
    // height; a spacer only sets a minimum for rows 1–2 (the stage height), and the section is a
    // subgrid, so the heading follows the buttons and the cards start below the stage.
    expect(homeCss).not.toMatch(/\.hero\s*\{[^}]*(min-)?height/);
    expect(homeCss).toMatch(/\.top\s*\{[^}]*grid-template-rows:\s*auto 1fr auto/);
    expect(homeCss).toMatch(
      /\.top::before\s*\{[^}]*grid-row:\s*1 \/ 3;[^}]*height:\s*calc\(var\(--home-stage-block, var\(--home-stage-height\)\) \+ var\(--space-3\)\)/,
    );
    expect(homeCss).toMatch(
      /\.whatIDo\s*\{[^}]*grid-template-rows:\s*subgrid;[^}]*grid-row:\s*2 \/ span 2/,
    );
    // The heading sits at the end of its flexible row, right above the cards.
    expect(homeCss).toMatch(/\.whatIDo > h2\s*\{[^}]*align-self:\s*end/);
  });

  it('caps the hero text column, keeping its line breaks on wide screens', () => {
    expect(homeCss).toMatch(/max-width:\s*min\([^;]*var\(--home-hero-text-max\)\s*\);/);
  });
});
