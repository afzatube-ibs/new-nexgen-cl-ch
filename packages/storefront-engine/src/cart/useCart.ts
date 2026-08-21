'use client';

import { useCallback, useSyncExternalStore } from 'react';
import * as cartStore from './cartStore.js';
import type { AddItemInput, Cart } from './types.js';

/**
 * Beta Sprint 3 — Cart Engine. `useSyncExternalStore` (not `useEffect` +
 * `useState`, the pattern `recentlyViewed.ts`'s own `RecentlyViewedRail`
 * uses) — deliberately upgraded here because a cart genuinely needs
 * same-render-cycle consistency across many simultaneous consumers (the
 * header's cart badge, `CartDrawer`, an `AddToCartButton`'s own pending
 * state, a future `/cart` page all reading the same store at once); this
 * is precisely the case React's own external-store API exists for,
 * unlike `recentlyViewed.ts`'s single-consumer read-once-on-mount need.
 *
 * The empty-array snapshot on the server render (`getServerSnapshot`)
 * matches `cartStore.ts`'s own SSR guard exactly, so hydration never
 * mismatches — the real cart populates client-side on the first
 * `useSyncExternalStore` read after mount.
 */
const EMPTY_CART: Cart = { lines: [], updatedAt: new Date(0).toISOString() };

export interface UseCartResult {
  cart: Cart;
  activeItemCount: number;
  addItem: (input: AddItemInput) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  clearCart: () => void;
  saveForLater: (lineId: string) => void;
  moveToCart: (lineId: string) => void;
  removeSavedItem: (lineId: string) => void;
}

export function useCart(): UseCartResult {
  const cart = useSyncExternalStore(cartStore.subscribe, cartStore.getCart, () => EMPTY_CART);

  const addItem = useCallback((input: AddItemInput) => cartStore.addItem(input), []);
  const updateQuantity = useCallback((lineId: string, quantity: number) => cartStore.updateQuantity(lineId, quantity), []);
  const removeItem = useCallback((lineId: string) => cartStore.removeItem(lineId), []);
  const clearCart = useCallback(() => cartStore.clearCart(), []);
  const saveForLater = useCallback((lineId: string) => cartStore.saveForLater(lineId), []);
  const moveToCart = useCallback((lineId: string) => cartStore.moveToCart(lineId), []);
  const removeSavedItem = useCallback((lineId: string) => cartStore.removeSavedItem(lineId), []);

  return {
    cart,
    activeItemCount: cartStore.getActiveItemCount(cart),
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    saveForLater,
    moveToCart,
    removeSavedItem,
  };
}
