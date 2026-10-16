import { render } from '@testing-library/react';
import type { ComponentType } from 'react';
import { MemoryRouter } from 'react-router';

/** Renders a section page on its own (pages contain router links). */
export function renderPage(Page: ComponentType) {
  return render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>,
  );
}
