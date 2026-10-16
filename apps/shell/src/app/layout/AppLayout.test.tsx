import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import AppLayout from './AppLayout.tsx';

function renderLayout() {
  render(
    <AppLayout currentPath="/">
      <h1>Page title</h1>
    </AppLayout>,
  );
}

describe('AppLayout', () => {
  it('exposes the page landmarks', () => {
    renderLayout();

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1 }));
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('links the brand to the home page', () => {
    renderLayout();

    expect(screen.getByRole('link', { name: /bruno.*software engineer/i })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('offers a skip link as the first Tab stop, targeting the main content', async () => {
    renderLayout();
    const user = userEvent.setup();

    await user.tab();

    const skipLink = screen.getByRole('link', { name: 'Skip to content' });
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute('href', '#main');
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main');
    expect(main).toHaveAttribute('tabindex', '-1');
  });
});
