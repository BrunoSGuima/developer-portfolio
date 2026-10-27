import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderPage } from '../../test/renderPage.tsx';
import ArchitecturePage from './ArchitecturePage.tsx';

// The same page as built in full-stack mode (VITE_APP_MODE=fullstack).
vi.mock('../../config/mode.ts', () => ({
  APP_MODES: ['static', 'fullstack'],
  appMode: 'fullstack',
  isFullStack: true,
}));

describe('ArchitecturePage, full-stack build', () => {
  it('says the Projects page and the contact form use the API', () => {
    renderPage(ArchitecturePage);

    const region = screen.getByRole('region', { name: 'How it will evolve' });
    expect(region).toHaveTextContent(
      /the Projects page loads from it and the contact form sends to it/,
    );
    expect(region).toHaveTextContent(/Validating that integration completes v3/);
    expect(region).not.toHaveTextContent(/static/);
  });
});
