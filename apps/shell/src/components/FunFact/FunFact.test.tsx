import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FunFact as FunFactContent } from '../../sections/registry.ts';
import { same } from '../../test/localized.ts';
import FunFact from './FunFact.tsx';

const fact: FunFactContent = {
  text: same('This section is built with React.'),
  tech: ['react', 'typescript'],
  plannedTech: ['rails'],
};

describe('FunFact', () => {
  it('is a complementary landmark named "Fun fact" containing the text', () => {
    render(<FunFact fact={fact} />);

    const aside = screen.getByRole('complementary', { name: 'Fun fact' });
    expect(aside).toHaveTextContent('Fun Fact');
    expect(aside).toHaveTextContent(fact.text.en);
  });

  it('lists live technologies first, then planned ones', () => {
    render(<FunFact fact={fact} />);

    const list = screen.getByRole('list', { name: 'Technologies' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'React',
      'TypeScript',
      'Ruby on Rails planned',
    ]);
  });

  it('hides the decorative icon from assistive technology', () => {
    const { container } = render(<FunFact fact={fact} />);

    const icon = container.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});
