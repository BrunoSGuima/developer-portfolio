import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PageIntro from './PageIntro.tsx';

describe('PageIntro', () => {
  it('puts the heading and lead in the intro slot and the rest in the body slot, in order', () => {
    const { container } = render(
      <PageIntro title="Projects" lead="Things I've built.">
        <p>Body content</p>
      </PageIntro>,
    );
    const intro = container.querySelector('[data-slot="page-intro"]')!;
    const body = container.querySelector('[data-slot="page-body"]')!;

    expect(intro).toContainElement(screen.getByRole('heading', { level: 1, name: 'Projects' }));
    expect(intro).toHaveTextContent("Things I've built.");
    expect(body).toContainElement(screen.getByText('Body content'));
    expect(intro.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders optional column content in the intro slot, after the lead', () => {
    const { container } = render(
      <PageIntro title="Architecture" lead="Lead." column={<p>Column content</p>}>
        <p>Body content</p>
      </PageIntro>,
    );
    const intro = container.querySelector('[data-slot="page-intro"]')!;
    const column = screen.getByText('Column content');

    expect(intro).toContainElement(column);
    expect(intro.lastElementChild).toBe(column);
    expect(container.querySelector('[data-slot="page-body"]')).not.toContainElement(column);
  });

  it('renders no body slot when there is no full-width content', () => {
    const { container } = render(<PageIntro title="Projects" lead="Lead." />);

    expect(container.querySelector('[data-slot="page-body"]')).toBeNull();
  });
});
