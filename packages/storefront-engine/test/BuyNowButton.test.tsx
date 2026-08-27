// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BuyNowButton } from '../src/cart/BuyNowButton.js';
import { clearCart } from '../src/cart/cartStore.js';
import type { Cart } from '../src/cart/types.js';

/**
 * Experience Polish Sprint 1, Pack 5 (item 5.1) — `BuyNowButton` had no
 * dedicated test before this pack touched its variant. This proves the
 * one real thing this pack changed (it now renders `Button`'s own
 * default `primary` treatment, not a hardcoded `secondary`) without ever
 * touching — and while re-confirming — the real add-to-cart-then-navigate
 * business logic the brief's own "preserve the Buy Now flow" instruction
 * requires stays exactly as it was. Same `next/navigation` mocking
 * approach as `CheckoutForm.test.tsx`.
 */
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

function readCart(): Cart {
  const raw = window.localStorage.getItem('nx_cart');
  return raw ? (JSON.parse(raw) as Cart) : { lines: [], updatedAt: new Date(0).toISOString() };
}

beforeEach(() => {
  clearCart();
  push.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('cart/BuyNowButton', () => {
  it('renders with the dominant primary treatment, not the previous secondary one', () => {
    render(<BuyNowButton productId="p1" name="Widget" href="/products/p1" />);
    const button = screen.getByRole('button', { name: 'Buy now' });
    expect(button.className).toContain('bg-brand');
    expect(button.className).not.toContain('bg-surface-subtle');
  });

  it('still adds a real line to the real cart and navigates to /checkout on click — unchanged business logic', () => {
    render(<BuyNowButton productId="p1" name="Widget" href="/products/p1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Buy now' }));

    expect(readCart().lines).toHaveLength(1);
    expect(readCart().lines[0]).toMatchObject({ id: 'p1', productId: 'p1', quantity: 1 });
    expect(push).toHaveBeenCalledWith('/checkout');
  });

  it('does not add anything or navigate when disabled', () => {
    render(<BuyNowButton productId="p1" name="Widget" href="/products/p1" disabled disabledReason="Unavailable" />);

    fireEvent.click(screen.getByRole('button', { name: 'Widget — Unavailable' }));

    expect(readCart().lines).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
  });

  it('defaults to the md height, and matches AddToCartButton\'s lg height when size="lg" is requested (Pack 5.5)', () => {
    const { unmount } = render(<BuyNowButton productId="p1" name="Widget" href="/products/p1" />);
    expect(screen.getByRole('button', { name: 'Buy now' }).className).toContain('h-9');
    unmount();

    render(<BuyNowButton productId="p1" name="Widget" href="/products/p1" size="lg" />);
    expect(screen.getByRole('button', { name: 'Buy now' }).className).toContain('h-10');
  });
});
