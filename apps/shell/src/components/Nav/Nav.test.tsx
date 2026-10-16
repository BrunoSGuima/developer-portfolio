import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import Nav, { type NavItem } from './Nav.tsx';

const items: readonly NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Projects', href: '/projects' },
];

function renderNav(currentPath = '/about') {
  render(<Nav items={items} currentPath={currentPath} />);
  return {
    user: userEvent.setup(),
    menuButton: screen.getByRole('button', { name: 'Menu' }),
    nav: screen.getByRole('navigation', { name: 'Main' }),
  };
}

// jsdom does not evaluate media queries, so these tests exercise the small-screen behaviour:
// the list is collapsed (and therefore inaccessible) until the Menu button opens it.
describe('Nav', () => {
  it('keeps the navigation landmark and Menu button available while collapsed', () => {
    const { menuButton, nav } = renderNav();

    expect(nav).toContainElement(menuButton);
    expect(within(nav).queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders every item as a link, in order, once opened', async () => {
    const { user, menuButton, nav } = renderNav();
    await user.click(menuButton);

    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Home', 'About', 'Projects']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/', '/about', '/projects']);
  });

  it('marks only the current item with aria-current="page"', async () => {
    const { user, menuButton, nav } = renderNav('/about');
    await user.click(menuButton);

    expect(within(nav).getByRole('link', { name: 'About' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
    expect(within(nav).getByRole('link', { name: 'Projects' })).not.toHaveAttribute('aria-current');
  });

  it('toggles the menu with the Menu button', async () => {
    const { user, menuButton } = renderNav();
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');

    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('links the Menu button to the list it controls', async () => {
    const { user, menuButton, nav } = renderNav();
    await user.click(menuButton);

    const listId = menuButton.getAttribute('aria-controls');
    expect(listId).toBeTruthy();
    expect(within(nav).getByRole('list')).toHaveAttribute('id', listId);
  });

  it('closes the menu on Escape and returns focus to the Menu button', async () => {
    const { user, menuButton, nav } = renderNav();
    await user.click(menuButton);
    within(nav).getByRole('link', { name: 'Projects' }).focus();

    await user.keyboard('{Escape}');

    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton).toHaveFocus();
  });

  it('closes the menu when a link is chosen', async () => {
    const { user, menuButton, nav } = renderNav();
    await user.click(menuButton);

    await user.click(within(nav).getByRole('link', { name: 'Projects' }));

    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the menu when clicking outside the navigation', async () => {
    render(<p>Outside content</p>);
    const { user, menuButton } = renderNav();
    await user.click(menuButton);

    await user.click(screen.getByText('Outside content'));

    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });
});
