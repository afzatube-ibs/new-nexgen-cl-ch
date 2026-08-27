// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckoutForm } from '../src/checkout/CheckoutForm.js';
import { addItem, clearCart, getCart } from '../src/cart/cartStore.js';
import * as checkoutClient from '../src/checkout/checkoutClient.js';

/**
 * Real, deterministic coverage of `CheckoutForm`'s own real validation and
 * real submission — same `@vitest-environment jsdom` + React Testing
 * Library approach `AddToCartButton.test.tsx` established.
 *
 * Beta Sprint 5 — `submitCheckout` is mocked at the module boundary here
 * (this file's own concern is CheckoutForm's own behavior: what it sends
 * and how it reacts, not the real Gateway's own HTTP contract, which
 * `checkoutClient.test.ts` covers directly against a stubbed `fetch`).
 * `next/navigation`'s `useRouter` is mocked because this component runs
 * outside a real Next.js App Router tree in a unit test.
 *
 * neXgen Overnight Sprint — Milestone 1, Objective 1. `fetchShippingOptions`
 * is mocked the same way: selecting a Division now triggers a real fetch,
 * so any test that reaches "Place order" successfully selects a Division
 * and waits for a real (mocked) shipping option to appear and auto-select.
 */
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const REAL_SHIPPING_OPTION = { id: 'method-1', label: 'Standard Delivery', amount: '60.0000', currencyCode: 'BDT' };

function selectDivision() {
  fireEvent.click(screen.getByRole('combobox', { name: 'Division' }));
  fireEvent.click(screen.getByRole('option', { name: 'Dhaka' }));
}

beforeEach(() => {
  clearCart();
  push.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('checkout/CheckoutForm', () => {
  it('shows the honest empty-cart state when there is nothing to check out', () => {
    render(<CheckoutForm />);
    expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeTruthy();
  });

  it('renders the real order summary from the real cart when items exist', () => {
    addItem({ productId: 'p1', name: 'Widget', href: '/products/p1', quantity: 2 });
    render(<CheckoutForm />);
    expect(screen.getByText('Widget')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Place order' })).toBeTruthy();
  });

  it('blocks submission and shows real validation errors when required fields are empty', () => {
    addItem({ productId: 'p1', name: 'Widget', href: '/products/p1' });
    render(<CheckoutForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    expect(screen.getByText('Email is required.')).toBeTruthy();
    expect(screen.getByText('Recipient name is required.')).toBeTruthy();
    expect(screen.getByText('Phone number is required.')).toBeTruthy();
    expect(screen.getByText('Street address is required.')).toBeTruthy();
    expect(screen.getByText('City is required.')).toBeTruthy();
    expect(screen.getByText('Division is required.')).toBeTruthy();
    expect(screen.getByText('Select a shipping method.')).toBeTruthy();
    expect(screen.getByText('Select a payment method.')).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it('fetches real shipping options once a Division is selected, and auto-selects the first real option', async () => {
    addItem({ productId: 'p1', name: 'Widget', href: '/products/p1' });
    const fetchSpy = vi.spyOn(checkoutClient, 'fetchShippingOptions').mockResolvedValue([REAL_SHIPPING_OPTION]);

    render(<CheckoutForm />);
    selectDivision();

    await waitFor(() => expect(screen.getByText('Standard Delivery')).toBeTruthy());
    expect(screen.getByText('60.0000 BDT')).toBeTruthy();
    expect(screen.getByRole<HTMLInputElement>('radio', { name: /Standard Delivery/ }).checked).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith({ countryCode: 'BD', region: 'Dhaka', lines: [{ productId: 'p1', quantity: 1 }] });
  });

  it('shows an honest empty state, never a fabricated rate, when no real shipping option covers this address', async () => {
    addItem({ productId: 'p1', name: 'Widget', href: '/products/p1' });
    vi.spyOn(checkoutClient, 'fetchShippingOptions').mockResolvedValue([]);

    render(<CheckoutForm />);
    selectDivision();

    await waitFor(() => expect(screen.getByText('No shipping options are available for this address yet.')).toBeTruthy());
  });

  it('submits the real request shape, clears the cart, and redirects to /checkout/success on a real success', async () => {
    addItem({ productId: 'p1', name: 'Widget', href: '/products/p1' });
    vi.spyOn(checkoutClient, 'fetchShippingOptions').mockResolvedValue([REAL_SHIPPING_OPTION]);
    const submitCheckoutSpy = vi.spyOn(checkoutClient, 'submitCheckout').mockResolvedValue({
      order: { id: 'o1', orderNumber: 'ORD-1' } as unknown as checkoutClient.SubmittedOrder,
      payment: { id: 'pay-1', status: 'pending' } as unknown as checkoutClient.CheckoutPayment,
      paymentError: null,
    });

    render(<CheckoutForm />);

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'shopper@example.com' } });
    fireEvent.change(screen.getByLabelText('Recipient name'), { target: { value: 'Jane Shopper' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '01700000000' } });
    fireEvent.change(screen.getByLabelText('Street address'), { target: { value: 'House 1, Road 2' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Dhaka' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Cash on Delivery' }));
    selectDivision();

    await waitFor(() => expect(screen.getByText('Standard Delivery')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/checkout/success'));

    expect(submitCheckoutSpy).toHaveBeenCalledTimes(1);
    const sentBody = submitCheckoutSpy.mock.calls[0]?.[0];
    expect(sentBody).toMatchObject({
      email: 'shopper@example.com',
      name: 'Jane Shopper',
      currencyCode: 'BDT',
      shippingOptionId: 'method-1',
      paymentGatewayCode: 'cod',
      lines: [{ productId: 'p1', quantity: 1 }],
    });
    expect(sentBody?.address.city).toBe('Dhaka');
    // A real success clears the real cart — never leaves a stale local cart behind a real, placed order.
    expect(getCart().lines).toHaveLength(0);
  });

  it('shows the real, specific error message on a failed submission — never a fabricated confirmation', async () => {
    addItem({ productId: 'p1', name: 'Widget', href: '/products/p1' });
    vi.spyOn(checkoutClient, 'fetchShippingOptions').mockResolvedValue([REAL_SHIPPING_OPTION]);
    vi.spyOn(checkoutClient, 'submitCheckout').mockRejectedValue(new Error('Could not reach the server. Please check your connection and try again.'));

    render(<CheckoutForm />);

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'shopper@example.com' } });
    fireEvent.change(screen.getByLabelText('Recipient name'), { target: { value: 'Jane Shopper' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '01700000000' } });
    fireEvent.change(screen.getByLabelText('Street address'), { target: { value: 'House 1, Road 2' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Dhaka' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Cash on Delivery' }));
    selectDivision();

    await waitFor(() => expect(screen.getByText('Standard Delivery')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    await waitFor(() => expect(screen.getByText('Could not reach the server. Please check your connection and try again.')).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
    // The real cart survives a real failure — nothing was placed, nothing should be lost.
    expect(getCart().lines).toHaveLength(1);
  });
});
