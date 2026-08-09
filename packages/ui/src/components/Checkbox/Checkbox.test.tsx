import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox.js';

describe('Checkbox', () => {
  it('toggles via mouse click', async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox label="Accept terms" onCheckedChange={onCheckedChange} />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Accept terms' }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('toggles via keyboard Space, per UI:ACCESSIBILITY full keyboard operability', async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox label="Accept terms" onCheckedChange={onCheckedChange} />);

    await userEvent.tab();
    expect(screen.getByRole('checkbox')).toHaveFocus();
    await userEvent.keyboard(' ');

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('renders the indeterminate state distinctly from checked/unchecked', () => {
    render(<Checkbox label="Select all" checked="indeterminate" onCheckedChange={() => {}} />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('data-state', 'indeterminate');
  });
});
