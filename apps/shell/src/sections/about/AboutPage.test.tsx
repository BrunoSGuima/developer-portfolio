import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { experience } from '../../content/experience.ts';
import { PHONE_PATTERN } from '../../test/privacy.ts';
import { about } from '../../content/profile.ts';
import { renderPage } from '../../test/renderPage.tsx';
import { renderRoute } from '../../test/renderRoute.tsx';
import page from '../Page.module.css';
import aboutCss from './AboutPage.module.css?raw';
import styles from './AboutPage.module.css';
import AboutPage from './AboutPage.tsx';

describe('AboutPage', () => {
  it('has the main sections', () => {
    renderPage(AboutPage);

    expect(screen.getByRole('heading', { level: 1, name: 'About' })).toBeInTheDocument();
    for (const name of ['Experience', 'Skills', 'Education', 'Languages', 'Background']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
  });

  it('lists experience most recent first, with machine-readable dates', () => {
    renderPage(AboutPage);

    const jobs = screen.getAllByRole('article');
    expect(jobs).toHaveLength(experience.length);
    expect(jobs[0]).toHaveAccessibleName('Software Developer, Vortigo Digital');

    const starts = jobs.map((job) => job.querySelector('time')?.getAttribute('datetime') ?? '');
    expect(starts).toEqual([...starts].sort().reverse());
    expect(within(jobs[0]!).getByText('Jun 2025')).toBeInTheDocument();
    expect(within(jobs[0]!).getByText('Aug 2026')).toBeInTheDocument();
  });

  it('keeps Python under "Currently developing", never under professional experience', () => {
    renderPage(AboutPage);

    const professional = screen.getByRole('region', { name: 'Professional experience' });
    const developing = screen.getByRole('region', { name: 'Currently developing' });
    expect(professional).toHaveTextContent(/Ruby on Rails/);
    expect(professional).not.toHaveTextContent(/Python/);
    expect(developing).toHaveTextContent(/Python and AI engineering/);
  });

  // Lists the PDFs in apps/shell/public/resumes without importing them.
  const publicResumes = Object.keys(import.meta.glob('../../../public/resumes/*.pdf'));

  it('offers the English résumé as a download that exists in the public folder', () => {
    renderPage(AboutPage);

    const link = screen.getByRole('link', { name: /download my résumé/i });
    expect(link).toHaveAttribute('download');
    const href = link.getAttribute('href') ?? '';
    expect(href).toBe(about.resume.href.en);
    expect(href).toMatch(/^\/resumes\/[\w-]+\.pdf$/);
    expect(publicResumes).toContain(`../../../public${href}`);
  });

  it('offers the Portuguese résumé on the Portuguese page', async () => {
    renderRoute('/pt-br/about');

    const link = await screen.findByRole('link', { name: 'Baixar meu currículo (PDF)' });
    expect(link).toHaveAttribute('download');
    expect(link).toHaveAttribute('href', about.resume.href['pt-BR']);
    expect(publicResumes).toContain(`../../../public${about.resume.href['pt-BR']}`);
  });

  it('links each language to its own résumé, with no other PDF published', () => {
    expect(about.resume.href.en).not.toBe(about.resume.href['pt-BR']);
    expect(publicResumes.map((file) => file.replace('../../../public', '')).sort()).toEqual(
      [about.resume.href.en, about.resume.href['pt-BR']].sort(),
    );
    expect(Object.keys(import.meta.glob('../../../public/*.pdf'))).toEqual([]);
  });

  it('has no pending placeholders and no phone number', () => {
    const { container } = renderPage(AboutPage);

    expect(screen.queryByText(/^To confirm:/)).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(PHONE_PATTERN);
  });

  it('uses more width on wide screens: experience in up to two columns', () => {
    renderPage(AboutPage);
    // jsdom can't lay out: check the classes and the grid setting (verified in Chromium).
    const experienceList = within(screen.getByRole('region', { name: 'Experience' })).getAllByRole(
      'list',
    )[0];

    expect(experienceList).toHaveClass(page.cardGridFit!, styles.timeline!);
    expect(aboutCss).toMatch(/\.timeline\s*\{[^}]*--grid-min:\s*26rem;/);
  });
});
