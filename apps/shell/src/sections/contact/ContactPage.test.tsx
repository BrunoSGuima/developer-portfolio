import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PHONE_PATTERN } from '../../test/privacy.ts';
import { renderPage } from '../../test/renderPage.tsx';
import ContactPage from './ContactPage.tsx';

describe('ContactPage', () => {
  it('links to email, LinkedIn and GitHub with real URLs', () => {
    renderPage(ContactPage);

    expect(screen.getByRole('link', { name: /@gmail\.com$/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^mailto:/),
    );
    expect(screen.getByRole('link', { name: /linkedin\.com/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^https:\/\//),
    );
    expect(screen.getByRole('link', { name: /github\.com/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^https:\/\//),
    );
  });

  it('shows the location and never a phone number', () => {
    const { container } = renderPage(ContactPage);

    expect(screen.getByText('Salvador, Brazil (UTC−3)')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(PHONE_PATTERN);
    expect(screen.queryByRole('link', { name: /phone|tel/i })).not.toBeInTheDocument();
  });

  it('states availability for remote work', () => {
    renderPage(ContactPage);

    expect(screen.getByText("I'm open to remote work and time-zone overlap.")).toBeInTheDocument();
    expect(screen.queryByText(/^To confirm:/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('has no contact form in a static build (tests run as one)', () => {
    renderPage(ContactPage);

    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
