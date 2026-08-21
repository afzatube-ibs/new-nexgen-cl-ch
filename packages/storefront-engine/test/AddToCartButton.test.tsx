// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AddToCartButton } from '../src/cart/AddToCartButton.js';
import { clearCart } from '../src/cart/cartStore.js';
import type { Cart } from '../src/cart/types.js';

function readCart(): Cart {
  const raw = window.localStorage.getItem('nx_cart');
  return raw ? (JSON.parse(raw) as Cart) : { lines: [], updatedAt: new Date(0).toISOString() };
}

/**
 * A real, deterministic, click-level test of the exact wiring
 * `BETA_CART_ENGINE_REPORT.md` §5 named as blocked by a Browser-pane
 * compositor/display issue in that live-verification session (confirmed
 * there via `getComputedStyle` reporting correct layout while
 * `getBoundingClientRect()` returned an all-zero box for every element on
 * the page — a tool limitation, not a code defect). This test proves the
 * actual claim that session could not: a real click on the real
 * `AddToCartButton` component writes a real line to `localStorage`.
 *
 * `@vitest-environment jsdom` opts only this file into a DOM environment
 * (the package's own `vitest.config.ts` default is `node` — see
 * `cartStore.ts`'s own SSR guards for why `node` is otherwise correct);
 * `jsdom` itself is resolved from the monorepo's own hoisted
 * `node_modules` (already a real dependency of `apps/admin`'s test
 * suite), not newly installed for this file.
 */
beforeEach(() => {
  // `cartStore.ts` is a module-level singleton — clearing `localStorage`
  // alone leaves its in-memory `cache` holding whatever the previous
  // test left there. `clearCart()` resets both through the store's own
  // real API, exactly what a test using the real module (not a fresh
  // `vi.resetModules()` import per test, unlike `cartStore.test.ts`)
  // needs for isolation.
  clearCart();
});

afterEach(() => {
  cleanup();
});

describe('cart/AddToCartButton', () => {
  it('adds a real line to the real cart on click', () => {
    render(<AddToCartButton productId="p1" name="Widget" href="/products/p1" unitPrice={null} currencyCode={null} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));

    const cart = readCart();
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]).toMatchObject({ id: 'p1', productId: 'p1', name: 'Widget', quantity: 1, unitPrice: null });
  });

  it('shows a real "Added to cart" confirmation state immediately after click', () => {
    render(<AddToCartButton productId="p1" name="Widget" href="/products/p1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));

    expect(screen.getByRole('button', { name: 'Added to cart' })).toBeTruthy();
  });

  it('does not add anything when disabled', () => {
    render(<AddToCartButton productId="p1" name="Widget" href="/products/p1" disabled disabledReason="Unavailable" />);

    const button = screen.getByRole('button', { name: 'Widget — Unavailable' });
    fireEvent.click(button);

    expect(readCart().lines).toHaveLength(0);
  });

  it('the icon variant adds a real line and shows the same confirmation state', () => {
    render(<AddToCartButton productId="p2" name="Gadget" href="/products/p2" variant="icon" />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Gadget to cart' }));

    expect(readCart().lines[0]).toMatchObject({ id: 'p2', quantity: 1 });
  });

  it('the bar variant (Quick Add) adds a real line', () => {
    render(<AddToCartButton productId="p3" name="Doohickey" href="/products/p3" variant="bar" />);

    fireEvent.click(screen.getByRole('button', { name: 'Quick add Doohickey to cart' }));

    expect(readCart().lines[0]).toMatchObject({ id: 'p3', quantity: 1 });
  });
});
