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
  it('says the Projects page and the contact form use the API, completing v3', () => {
    renderPage(ArchitecturePage);

    const region = screen.getByRole('region', { name: 'How it will evolve' });
    expect(region).toHaveTextContent(/Frontend\/backend integration \(MVP\)\s*Done/);
    expect(region).toHaveTextContent(
      /Projects page loads from the Rails API and the contact form sends messages to it, completing the integration \(v3\)/,
    );
    expect(region).not.toHaveTextContent(/static/);
  });
});
