import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TechBadge from './TechBadge.tsx';

describe('TechBadge', () => {
  it('shows the technology label from the catalogue', () => {
    render(<TechBadge tech="react-router" />);

    expect(screen.getByText('React Router')).toBeInTheDocument();
    expect(screen.queryByText('planned')).not.toBeInTheDocument();
  });

  it('labels a planned technology with a visible word, not just styling', () => {
    const { container } = render(<TechBadge tech="vue" status="planned" />);

    expect(screen.getByText('planned')).toBeVisible();
    expect(container).toHaveTextContent('Vue.js planned');
  });
});
