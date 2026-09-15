// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as NexgenUi from '@nexgen/ui';
import { ShippingCalculator } from '../src/components/ShippingCalculator.js';
import * as checkoutClient from '../src/checkout/checkoutClient.js';

vi.mock('@nexgen/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof NexgenUi>();
  return {
    ...actual,
    Select: ({ label, value, options, onValueChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onValueChange: (value: string) => void }) => (
      <label>{label}<select aria-label={label} value={value} onChange={(event) => onValueChange(event.target.value)}><option value="">Select division</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    ),
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('components/ShippingCalculator', () => {
  it('requests a real product quote for the selected division and renders returned rates', async () => {
    const quote = vi.spyOn(checkoutClient, 'fetchShippingOptions').mockResolvedValue([
      { id: 'standard', label: 'Standard Delivery', amount: '60.0000', currencyCode: 'BDT' },
    ]);
    render(<ShippingCalculator productId="11111111-1111-4111-8111-111111111111" />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Delivery division' }), { target: { value: 'dhaka' } });
    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));
    await waitFor(() => expect(screen.getByText('Standard Delivery')).toBeTruthy());
    expect(screen.getByText(/60/)).toBeTruthy();
    expect(quote).toHaveBeenCalledWith({ countryCode: 'BD', currencyCode: 'BDT', region: 'Dhaka', lines: [{ productId: '11111111-1111-4111-8111-111111111111', quantity: 1 }] });
  });

  it('shows an honest empty state when no configured rate matches', async () => {
    vi.spyOn(checkoutClient, 'fetchShippingOptions').mockResolvedValue([]);
    render(<ShippingCalculator productId="11111111-1111-4111-8111-111111111111" />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Delivery division' }), { target: { value: 'sylhet' } });
    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));
    await waitFor(() => expect(screen.getByText('No delivery option is available for this product and division.')).toBeTruthy());
  });

  it('surfaces Gateway failures without inventing a price', async () => {
    vi.spyOn(checkoutClient, 'fetchShippingOptions').mockRejectedValue(new Error('Delivery service is temporarily unavailable.'));
    render(<ShippingCalculator productId="11111111-1111-4111-8111-111111111111" />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Delivery division' }), { target: { value: 'rangpur' } });
    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('temporarily unavailable'));
    expect(screen.queryByLabelText('Delivery estimates')).toBeNull();
  });
});
