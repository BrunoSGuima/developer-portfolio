import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import AppLayout from './AppLayout.tsx';
import layoutCss from './AppLayout.module.css?raw';

function renderLayout() {
  render(
    <MemoryRouter>
      <AppLayout>
        <h1>Page title</h1>
      </AppLayout>
    </MemoryRouter>,
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

    expect(
      screen.getByRole('link', { name: 'Bruno Soares Guimarães Full-Stack Software Engineer' }),
    ).toHaveAttribute('href', '/');
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

  it.each([
    [undefined, 'stacked'],
    ['aside', 'aside'],
    ['intro', 'intro'],
  ] as const)(
    'renders placement %s as data-context="%s", Fun Fact before main',
    (placement, expected) => {
      const { container } = render(
        <MemoryRouter>
          <AppLayout
            context={<aside aria-label="Fun fact">Fact</aside>}
            {...(placement ? { contextPlacement: placement } : {})}
          >
            <h1>Page title</h1>
          </AppLayout>
        </MemoryRouter>,
      );
      const columns = container.querySelector('[data-context]')!;
      const aside = screen.getByRole('complementary', { name: 'Fun fact' });
      const main = screen.getByRole('main');

      expect(columns).toHaveAttribute('data-context', expected);
      expect(columns).toContainElement(aside);
      expect(columns).toContainElement(main);
      expect(aside.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    },
  );

  it('starts the aside column on the same line as the content, clear of the navbar', () => {
    // jsdom can't apply media queries, so check the stylesheet itself: in the aside layout the
    // Fun Fact column gets the same top spacing token as <main>.
    expect(layoutCss).toMatch(/\.main\s*\{[^}]*padding-block:\s*var\(--page-top-space\)/);
    expect(layoutCss).toMatch(
      /\[data-context='aside'\]\s*\.contextRow\s*\{[^}]*padding-block-start:\s*var\(--page-top-space\)/,
    );
    expect(layoutCss).not.toMatch(/overflow(-y)?:\s*(hidden|clip)/);
  });

  it('lays out the intro placement as a subgrid: intro beside the Fun Fact, body full width', () => {
    // As above, jsdom can't apply media queries: check the rules themselves.
    const rule = (selector: string) =>
      new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(
        layoutCss,
      )?.[1] ?? '';

    expect(rule(".columns[data-context='intro'] .main")).toMatch(/grid-template-rows:\s*subgrid/);
    expect(rule(".columns[data-context='intro'] .main")).toMatch(/grid-column:\s*1 \/ -1/);
    expect(rule(".columns[data-context='intro'] .contextRow")).toMatch(
      /grid-row:\s*1;[^}]*grid-column:\s*2;[^}]*padding-block-start:\s*var\(--page-top-space\)/,
    );
    expect(rule(".columns[data-context='intro'] [data-slot='page-intro']")).toMatch(
      /grid-row:\s*1;\s*grid-column:\s*1;/,
    );
    expect(rule(".columns[data-context='intro'] [data-slot='page-body']")).toMatch(
      /grid-row:\s*2;\s*grid-column:\s*1 \/ -1;/,
    );
  });
});
