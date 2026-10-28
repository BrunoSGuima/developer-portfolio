import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleContext } from '../../i18n/context.ts';
import { setMedia } from '../../test/media.ts';
import { renderRoute } from '../../test/renderRoute.tsx';
import { THEME_KEY } from '../../theme/theme.ts';
import styles from './ThemeToggle.module.css';
import css from './ThemeToggle.module.css?raw';
import ThemeToggle from './ThemeToggle.tsx';

const html = document.documentElement;

function renderToggle(locale: 'en' | 'pt-BR' = 'en') {
  return render(
    <LocaleContext value={locale}>
      <ThemeToggle />
    </LocaleContext>,
  );
}

describe('ThemeToggle', () => {
  it('is a button named in each language, pressed only in the dark theme', () => {
    html.dataset.theme = 'light';
    const { unmount } = renderToggle();

    const button = screen.getByRole('button', { name: 'Dark theme' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    unmount();

    html.dataset.theme = 'dark';
    renderToggle('pt-BR');
    expect(screen.getByRole('button', { name: 'Tema escuro' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('switches the theme, stores the choice and keeps focus (keyboard)', async () => {
    html.dataset.theme = 'light';
    const user = userEvent.setup();
    renderToggle();
    const button = screen.getByRole('button', { name: 'Dark theme' });

    button.focus();
    await user.keyboard('{Enter}');
    expect(html.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveFocus();

    await user.keyboard(' ');
    expect(html.dataset.theme).toBe('light');
    expect(window.localStorage.getItem(THEME_KEY)).toBe('light');
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('reflects a system change while nothing is stored', () => {
    html.dataset.theme = 'light';
    renderToggle();

    act(() => setMedia({ darkScheme: true }));
    expect(screen.getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows the state without colour alone: filled when pressed, outlined in forced colours', () => {
    renderToggle();
    // The icon is decorative; the name comes from the visually hidden text.
    expect(screen.getByRole('button').querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(css).toMatch(/\.toggle\[aria-pressed='true'\]\s*\{[^}]*background/);
    expect(css).toMatch(
      /@media \(forced-colors: active\)\s*\{\s*\.toggle\[aria-pressed='true'\]\s*\{\s*outline/,
    );
    expect(screen.getByRole('button')).toHaveClass(styles.toggle!);
  });
});

describe('ThemeToggle in the header', () => {
  // jsdom has no media queries: the nav renders collapsed, so the header's copy is hidden and the
  // menu panel's copy is the one in reach (like the language switcher).
  it('is in the header and in the menu panel, beside the language switcher', async () => {
    const { user } = renderRoute('/pt-br/about');
    await screen.findByRole('heading', { level: 1 });

    expect(screen.getAllByRole('button', { name: 'Tema escuro', hidden: true })).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    const panel = document.getElementById('primary-nav-panel')!;
    expect(within(panel).getByRole('navigation', { name: 'Idioma' })).toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Tema escuro' }));
    expect(html.dataset.theme).toBe('dark');
    for (const toggle of screen.getAllByRole('button', { name: 'Tema escuro', hidden: true })) {
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
    }
  });

  it('keeps the theme across navigation and a language switch', async () => {
    html.dataset.theme = 'light';
    const { user } = renderRoute('/about');
    await screen.findByRole('heading', { level: 1, name: 'About' });
    const panel = () => document.getElementById('primary-nav-panel')!;

    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(within(panel()).getByRole('button', { name: 'Dark theme' }));
    await user.click(within(panel()).getByRole('link', { name: /^PT/ }));
    await screen.findByRole('heading', { level: 1, name: 'Sobre' });
    expect(html.dataset.theme).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(within(panel()).getByRole('link', { name: 'Projetos' }));
    await screen.findByRole('heading', { level: 1, name: 'Projetos' });
    expect(html.dataset.theme).toBe('dark');
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(within(panel()).getByRole('button', { name: 'Tema escuro' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
