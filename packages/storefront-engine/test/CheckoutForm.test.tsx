// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CheckoutForm } from '../src/checkout/CheckoutForm.js';
import { addItem, clearCart } from '../src/cart/cartStore.js';

/**
 * Real, deterministic coverage of `CheckoutForm`'s own honest boundary —
 * validation runs for real, and a fully-valid submission shows the real
 * "can't complete your order yet" result rather than a fabricated
 * confirmation. Same `@vitest-environment jsdom` + React Testing Library
 * approach `AddToCartButton.test.tsx` established, for the same reason:
 * deterministic, independent of any browser compositor.
 */
beforeEach(() => {
  clearCart();
});

afterEach(() => {
  cleanup();
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
    expect(screen.getByText('Division is required.')).toBeTruthy();
    expect(screen.getByText('Select a payment method.')).toBeTruthy();
    // Never a fabricated confirmation — the "can't complete" panel must not appear on a blocked submission.
    expect(screen.queryByText("We can't complete your order yet")).toBeNull();
  });

  it('shows the honest "can\'t complete your order yet" result on a fully valid submission — never a fabricated confirmation', () => {
    addItem({ productId: 'p1', name: 'Widget', href: '/products/p1' });
    render(<CheckoutForm />);

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'shopper@example.com' } });
    fireEvent.change(screen.getByLabelText('Recipient name'), { target: { value: 'Jane Shopper' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '01700000000' } });
    fireEvent.change(screen.getByLabelText('Street address'), { target: { value: 'House 1, Road 2' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Cash on Delivery' }));

    // Division select uses @nexgen/ui's Radix Select — open it and pick an option.
    fireEvent.click(screen.getByRole('combobox', { name: 'Division' }));
    fireEvent.click(screen.getByRole('option', { name: 'Dhaka' }));

    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    expect(screen.getByText("We can't complete your order yet")).toBeTruthy();
    expect(screen.getByText(/order placement isn't connected yet/)).toBeTruthy();
  });
});
