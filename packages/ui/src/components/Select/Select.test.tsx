import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select } from './Select.js';

const OPTIONS = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
];

describe('Select', () => {
  it('associates `label` with the combobox trigger via `htmlFor`/`id`, giving it a real accessible name', () => {
    // Found live via the Catalog module's own `@axe-core/playwright` scan
    // (Phase 2.2) — the trigger previously had no accessible name at all
    // (a plain adjacent `<span>`, not a `<label htmlFor>`), a critical a11y
    // violation invisible until a real page finally used `label` on a
    // Select in a scanned page.
    render(<Select label="Status" options={OPTIONS} />);
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeInTheDocument();
  });

  it('renders with no accessible-name violation when no label is supplied', () => {
    render(<Select options={OPTIONS} placeholder="Choose one" />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
