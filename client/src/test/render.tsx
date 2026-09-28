import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';

/** Renders a component inside an in-memory router, starting at `route`. */
export function renderWithRouter(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}
