// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GuestOrderLookupForm } from '../src/order/GuestOrderLookupForm.js';
import * as checkoutClient from '../src/checkout/checkoutClient.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('order/GuestOrderLookupForm', () => {
  it('requires both fields before showing a result', () => {
    render(<GuestOrderLookupForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Track order' }));
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('renders the real, lighter order summary on a real match', async () => {
    vi.spyOn(checkoutClient, 'lookupOrder').mockResolvedValue({
      id: 'o1',
      orderNumber: 'ORD-100234',
      customerName: 'Jane Shopper',
      customerEmail: 'shopper@example.com',
      currencyCode: 'BDT',
      subtotal: 2490,
      discountTotal: 0,
      taxTotal: 0,
      shippingTotal: 5,
      grandTotal: 2495,
      status: 'pending',
      placedAt: '2026-08-21T20:43:39+00:00',
    });

    render(<GuestOrderLookupForm />);
    fireEvent.change(screen.getByLabelText('Order number'), { target: { value: 'ORD-100234' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'shopper@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Track order' }));

    await waitFor(() => expect(screen.getByText('ORD-100234')).toBeTruthy());
    expect(screen.getByText('pending')).toBeTruthy();
  });

  it('shows the real, generic "not found" message on a real mismatch — never a fabricated order', async () => {
    const notFound = new checkoutClient.CheckoutRequestError(404, {
      error: { code: 'not_found', message: "We couldn't find an order matching that order number and email." },
      meta: { requestId: 'r1' },
    });
    vi.spyOn(checkoutClient, 'lookupOrder').mockRejectedValue(notFound);

    render(<GuestOrderLookupForm />);
    fireEvent.change(screen.getByLabelText('Order number'), { target: { value: 'ORD-100234' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'shopper@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Track order' }));

    await waitFor(() => expect(screen.getByText(/We couldn't find an order matching/)).toBeTruthy());
  });
});
