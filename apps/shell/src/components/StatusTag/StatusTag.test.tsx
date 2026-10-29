import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatusTag from './StatusTag.tsx';

describe('StatusTag', () => {
  it.each([
    ['done', 'Completed'],
    ['live', 'Live'],
    ['in-progress', 'In progress'],
    ['planned', 'Planned'],
  ] as const)('shows "%s" as the word "%s"', (status, label) => {
    render(<StatusTag status={status} />);

    expect(screen.getByText(label)).toBeVisible();
  });
});
