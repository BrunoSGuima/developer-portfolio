import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { experience } from '../../content/experience.ts';
import { PHONE_PATTERN } from '../../test/privacy.ts';
import { renderPage } from '../../test/renderPage.tsx';
import AboutPage from './AboutPage.tsx';

describe('AboutPage', () => {
  it('has the main sections', () => {
    renderPage(AboutPage);

    expect(screen.getByRole('heading', { level: 1, name: 'About' })).toBeInTheDocument();
    for (const name of [
      'Experience at a glance',
      'Skills',
      'Education',
      'Languages',
      'Background',
    ]) {
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

  it('offers the résumé as a download that exists in the public folder', () => {
    renderPage(AboutPage);

    const link = screen.getByRole('link', { name: /download my résumé/i });
    expect(link).toHaveAttribute('download');
    const href = link.getAttribute('href') ?? '';
    expect(href).toMatch(/^\/[\w-]+\.pdf$/);
    // Lists files in apps/shell/public without importing them.
    const publicFiles = Object.keys(import.meta.glob('../../../public/*.pdf'));
    expect(publicFiles).toContain(`../../../public${href}`);
  });

  it('has no pending placeholders and no phone number', () => {
    const { container } = renderPage(AboutPage);

    expect(screen.queryByText(/^To confirm:/)).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(PHONE_PATTERN);
  });
});
