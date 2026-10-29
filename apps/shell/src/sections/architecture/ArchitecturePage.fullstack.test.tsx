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
    expect(region).toHaveTextContent(/Frontend\/backend integration \(MVP\)\s*Completed/);
    expect(region).toHaveTextContent(
      /Projects page loads from the Rails API and the contact form sends messages to it, completing the integration \(v3\)/,
    );
    expect(region).toHaveTextContent(
      /The published site \(v4\) is the static build; this mode runs locally/,
    );
    expect(region).not.toHaveTextContent(/this build is the static version/);
  });

  it('still describes both ways to run it, the full stack as local and not deployed', () => {
    renderPage(ArchitecturePage);

    const region = screen.getByRole('region', { name: 'Two ways to run it' });
    expect(region).toHaveTextContent(/Static site\s*The production build/);
    expect(region).toHaveTextContent(/Full-stack mode\s*Runs locally/);
    expect(region).toHaveTextContent(/Not deployed/);
  });
});
