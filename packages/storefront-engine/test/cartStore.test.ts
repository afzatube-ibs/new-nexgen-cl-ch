import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `cartStore.ts` guards every browser API behind `typeof window ===
 * 'undefined'` (this package's own vitest environment is `node`, per
 * `vitest.config.ts` — no real `window`/`localStorage` exists by
 * default). A minimal, self-contained `window`/`localStorage` stub is
 * installed here, scoped to this file only, matching the same
 * "stub exactly what's needed for testability, nothing more" precedent
 * `test/mocks/server-only.js` already establishes for `gateway/client.ts`.
 *
 * The store is a module-level singleton (`cache`/`hydrated`), so every
 * test re-imports it fresh via `vi.resetModules()` — otherwise state
 * would leak between tests, exactly the bug this reset avoids.
 */
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

async function freshStore() {
  vi.resetModules();
  return import('../src/cart/cartStore.js');
}

beforeEach(() => {
  vi.stubGlobal('window', {
    localStorage: new MemoryStorage(),
    addEventListener: () => {},
    removeEventListener: () => {},
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cart/cartStore', () => {
  it('starts empty', async () => {
    const store = await freshStore();
    const cart = store.getCart();
    expect(cart.lines).toEqual([]);
  });

  it('adds a new line', async () => {
    const store = await freshStore();
    store.addItem({ productId: 'p1', name: 'Widget', href: '/products/p1', quantity: 1 });
    const cart = store.getCart();
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]).toMatchObject({ id: 'p1', productId: 'p1', name: 'Widget', quantity: 1, savedForLater: false });
  });

  it('merges a repeat add-to-cart by summing quantity on the same line', async () => {
    const store = await freshStore();
    store.addItem({ productId: 'p1', name: 'Widget', href: '/products/p1', quantity: 1 });
    store.addItem({ productId: 'p1', name: 'Widget', href: '/products/p1', quantity: 2 });
    const cart = store.getCart();
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]?.quantity).toBe(3);
  });

  it('floors and clamps a fractional/zero quantity to at least 1 on add', async () => {
    const store = await freshStore();
    store.addItem({ productId: 'p1', name: 'Widget', href: '/products/p1', quantity: 0.4 });
    expect(store.getCart().lines[0]?.quantity).toBe(1);
  });

  it('updateQuantity changes the line quantity', async () => {
    const store = await freshStore();
    store.addItem({ productId: 'p1', name: 'Widget', href: '/products/p1', quantity: 1 });
    store.updateQuantity('p1', 5);
    expect(store.getCart().lines[0]?.quantity).toBe(5);
  });

  it('updateQuantity to 0 or below removes the line', async () => {
    const store = await freshStore();
    store.addItem({ productId: 'p1', name: 'Widget', href: '/products/p1', quantity: 1 });
    store.updateQuantity('p1', 0);
    expect(store.getCart().lines).toHaveLength(0);
  });

  it('removeItem removes exactly the targeted line', async () => {
    const store = await freshStore();
    store.addItem({ productId: 'p1', name: 'Widget', href: '/products/p1' });
    store.addItem({ productId: 'p2', name: 'Gadget', href: '/products/p2' });
    store.removeItem('p1');
    const cart = store.getCart();
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]?.id).toBe('p2');
  });

  it('clearCart empties every line, active and saved', async () => {
    const store = await freshStore();
    store.addItem({ productId: 'p1', name: 'Widget', href: '/products/p1' });
    store.saveForLater('p1');
    store.clearCart();
    expect(store.getCart().lines).toHaveLength(0);
  });

  it('saveForLater / moveToCart round-trip the savedForLater flag without losing the line', async () => {
    const store = await freshStore();
    store.addItem({ productId: 'p1', name: 'Widget', href: '/products/p1' });
    store.saveForLater('p1');
    expect(store.getCart().lines[0]?.savedForLater).toBe(true);
    store.moveToCart('p1');
    expect(store.getCart().lines[0]?.savedForLater).toBe(false);
  });

  it('getActiveItemCount excludes saved-for-later lines', async () => {
    const store = await freshStore();
    store.addItem({ productId: 'p1', name: 'Widget', href: '/products/p1', quantity: 2 });
    store.addItem({ productId: 'p2', name: 'Gadget', href: '/products/p2', quantity: 3 });
    store.saveForLater('p2');
    expect(store.getActiveItemCount(store.getCart())).toBe(2);
  });

  it('persists across a fresh module import (simulating a reload) via the shared MemoryStorage', async () => {
    const first = await freshStore();
    first.addItem({ productId: 'p1', name: 'Widget', href: '/products/p1', quantity: 4 });

    const second = await freshStore();
    expect(second.getCart().lines[0]).toMatchObject({ id: 'p1', quantity: 4 });
  });

  it('never carries a fabricated price — unitPrice defaults to null when not supplied', async () => {
    const store = await freshStore();
    store.addItem({ productId: 'p1', name: 'Widget', href: '/products/p1' });
    expect(store.getCart().lines[0]?.unitPrice).toBeNull();
  });
});
