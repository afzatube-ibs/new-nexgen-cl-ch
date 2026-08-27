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
 */
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

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
    expect(screen.getByText('Select a payment method.')).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it('submits the real request shape, clears the cart, and redirects to /checkout/success on a real success', async () => {
    addItem({ productId: 'p1', name: 'Widget', href: '/products/p1' });
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

    // Division select uses @nexgen/ui's Radix Select — open it and pick an option.
    fireEvent.click(screen.getByRole('combobox', { name: 'Division' }));
    fireEvent.click(screen.getByRole('option', { name: 'Dhaka' }));

    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/checkout/success'));

    expect(submitCheckoutSpy).toHaveBeenCalledTimes(1);
    const sentBody = submitCheckoutSpy.mock.calls[0]?.[0];
    expect(sentBody).toMatchObject({
      email: 'shopper@example.com',
      name: 'Jane Shopper',
      currencyCode: 'BDT',
      shippingOptionId: 'standard',
      paymentGatewayCode: 'cod',
      lines: [{ productId: 'p1', quantity: 1 }],
    });
    expect(sentBody?.address.city).toBe('Dhaka');
    // A real success clears the real cart — never leaves a stale local cart behind a real, placed order.
    expect(getCart().lines).toHaveLength(0);
  });

  it('shows the real, specific error message on a failed submission — never a fabricated confirmation', async () => {
    addItem({ productId: 'p1', name: 'Widget', href: '/products/p1' });
    vi.spyOn(checkoutClient, 'submitCheckout').mockRejectedValue(new Error('Could not reach the server. Please check your connection and try again.'));

    render(<CheckoutForm />);

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'shopper@example.com' } });
    fireEvent.change(screen.getByLabelText('Recipient name'), { target: { value: 'Jane Shopper' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '01700000000' } });
    fireEvent.change(screen.getByLabelText('Street address'), { target: { value: 'House 1, Road 2' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Dhaka' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Cash on Delivery' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Division' }));
    fireEvent.click(screen.getByRole('option', { name: 'Dhaka' }));

    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    await waitFor(() => expect(screen.getByText('Could not reach the server. Please check your connection and try again.')).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
    // The real cart survives a real failure — nothing was placed, nothing should be lost.
    expect(getCart().lines).toHaveLength(1);
  });
});
