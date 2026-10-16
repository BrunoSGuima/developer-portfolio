import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { todo } from '../../content/placeholder.ts';
import { Text } from './Placeholder.tsx';

describe('Text', () => {
  it('renders confirmed text as-is', () => {
    render(<Text value="Salvador, Brazil" />);

    expect(screen.getByText('Salvador, Brazil')).toBeInTheDocument();
  });

  it('renders a placeholder as a visible "To confirm" marker, not a link', () => {
    render(<Text value={todo('your GitHub URL')} />);

    expect(screen.getByText('To confirm: your GitHub URL')).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
