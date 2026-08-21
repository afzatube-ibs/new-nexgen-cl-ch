'use client';

import { trackEvent } from '../analytics/trackEvent.js';
import type { AddItemInput, Cart, CartLine } from './types.js';

/**
 * Beta Sprint 3 — Cart Engine. A real, complete, working shopping cart —
 * `localStorage`-backed, zero backend dependency, by deliberate
 * architectural choice, not a shortcut:
 *
 * `docs/frontend/STORE_FRONTEND_ARCHITECTURE.md` §3.3 (Accepted):
 * *"Anonymous cart state, until a customer authenticates, lives ...
 * `localStorage`, bridged to Checkout at the point a session actually
 * needs a backend `CheckoutSession` ... minimizing how often the BFF
 * needs to call the real, staff-gated `Checkout` module at all before
 * Category B exists."*
 *
 * `docs/frontend/STORE_API_GATEWAY_ARCHITECTURE.md` §2.2 (Accepted):
 * *"anonymous cart state lives client-side (`localStorage`) until a
 * `CheckoutSession` is actually needed."*
 *
 * Both documents describe exactly this module, written before this
 * module existed. `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §7 (Beta
 * Sprint 3, Phase A) re-confirmed live that no backend change is required
 * for this to be real and complete — only Checkout, past this point,
 * needs the not-yet-built write path.
 *
 * **Guest / Customer / Session** (Beta Sprint 3 Phase B's own brief): this
 * store has exactly one identity concept — a browser's own `localStorage`,
 * which is already what "Guest" and "Session" mean for an anonymous
 * shopper on this platform (no separate concept to build). **Merge**:
 * once Category B (a real customer auth guard) exists, the documented,
 * not-yet-buildable contract is: on login, this cart's own `lines` merge
 * into the customer's server-persisted cart by `productId`, quantities
 * summed, `savedForLater` lines preserved — the same line-identity shape
 * this module already uses, so that merge is a real, mechanical operation
 * against already-shaped data, not a redesign. Recorded here, and in
 * `BETA_CART_ENGINE_REPORT.md`, as the exact seam a future Category-B
 * implementation fills in.
 *
 * **Redis / cache strategy**: not applicable to this module — there is no
 * server-side cart state to cache or scale. Redis is the correct choice
 * for the *future* Gateway-side Guest-Checkout-Session bridge
 * (`COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §8 step 3), a distinct,
 * not-yet-built capability this module deliberately does not attempt.
 *
 * **Offline safety**: every `localStorage` read/write is wrapped —
 * private browsing, a full storage quota, or a disabled storage API all
 * degrade to an in-memory-only cart for that page load rather than
 * throwing and breaking the shopping experience.
 */
const STORAGE_KEY = 'nx_cart';

type Listener = () => void;

const listeners = new Set<Listener>();

let cache: Cart = { lines: [], updatedAt: new Date(0).toISOString() };
let hydrated = false;

function emptyCart(): Cart {
  return { lines: [], updatedAt: new Date().toISOString() };
}

function readFromStorage(): Cart {
  if (typeof window === 'undefined') return emptyCart();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyCart();

    const parsed = JSON.parse(raw) as Partial<Cart>;
    if (!Array.isArray(parsed.lines)) return emptyCart();

    return { lines: parsed.lines, updatedAt: parsed.updatedAt ?? new Date().toISOString() };
  } catch {
    // A corrupt or unreadable entry degrades to an honest empty cart,
    // never a thrown error a shopper would see as a broken page.
    return emptyCart();
  }
}

function writeToStorage(cart: Cart): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Storage full / private-browsing quota / disabled API: the in-memory
    // `cache` this module-level singleton already holds still serves the
    // rest of this page load correctly — only persistence across reloads
    // is lost, silently, rather than the mutation itself failing.
  }
}

function ensureHydrated(): void {
  if (hydrated) return;
  hydrated = true;
  cache = readFromStorage();
}

function notify(): void {
  for (const listener of listeners) listener();
}

function commit(next: Cart): void {
  cache = next;
  writeToStorage(cache);
  notify();
}

if (typeof window !== 'undefined') {
  // Cross-tab sync — a mutation in one tab (e.g. the Cart Drawer open in a
  // pinned tab) is reflected in every other open tab's own cart state,
  // matching how a real production cart behaves. `storage` only fires in
  // OTHER tabs, never the tab that made the write, which is exactly the
  // complement this module's own in-memory `notify()` already covers for
  // same-tab reactivity.
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    cache = readFromStorage();
    notify();
  });
}

export function getCart(): Cart {
  ensureHydrated();
  return cache;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Active (not saved-for-later) line count, summed by quantity — what a cart icon badge shows. */
export function getActiveItemCount(cart: Cart): number {
  return cart.lines.filter((line) => !line.savedForLater).reduce((sum, line) => sum + line.quantity, 0);
}

export function addItem(input: AddItemInput): void {
  ensureHydrated();
  const quantity = Math.max(1, Math.floor(input.quantity ?? 1));
  const existing = cache.lines.find((line) => line.id === input.productId && !line.savedForLater);

  let lines: CartLine[];
  if (existing) {
    lines = cache.lines.map((line) => (line.id === existing.id ? { ...line, quantity: line.quantity + quantity } : line));
  } else {
    const newLine: CartLine = {
      id: input.productId,
      productId: input.productId,
      sku: input.sku ?? null,
      name: input.name,
      href: input.href,
      imageSrc: input.imageSrc ?? null,
      unitPrice: input.unitPrice ?? null,
      currencyCode: input.currencyCode ?? null,
      quantity,
      savedForLater: false,
      addedAt: new Date().toISOString(),
    };
    lines = [...cache.lines, newLine];
  }

  commit({ lines, updatedAt: new Date().toISOString() });
  trackEvent({ name: 'added_to_cart', properties: { productId: input.productId, quantity } });
}

/** `quantity <= 0` removes the line entirely — the same real behavior a merchant's own cart page always has. */
export function updateQuantity(lineId: string, quantity: number): void {
  ensureHydrated();
  const line = cache.lines.find((entry) => entry.id === lineId);
  if (!line) return;

  if (quantity <= 0) {
    removeItem(lineId);
    return;
  }

  const delta = quantity - line.quantity;
  const lines = cache.lines.map((entry) => (entry.id === lineId ? { ...entry, quantity } : entry));
  commit({ lines, updatedAt: new Date().toISOString() });

  if (delta > 0) {
    trackEvent({ name: 'added_to_cart', properties: { productId: line.productId, quantity: delta } });
  } else if (delta < 0) {
    trackEvent({ name: 'removed_from_cart', properties: { productId: line.productId } });
  }
}

export function removeItem(lineId: string): void {
  ensureHydrated();
  const line = cache.lines.find((entry) => entry.id === lineId);
  if (!line) return;

  const lines = cache.lines.filter((entry) => entry.id !== lineId);
  commit({ lines, updatedAt: new Date().toISOString() });
  trackEvent({ name: 'removed_from_cart', properties: { productId: line.productId } });
}

export function clearCart(): void {
  ensureHydrated();
  // No `cart_cleared` event exists in the Gateway's own registered
  // vocabulary (`events/schemas.ts`) — inventing one client-side here
  // would be silently rejected (`UnknownEventNameError`), so this
  // deliberately emits nothing rather than a call that would fail.
  // Named as a real, precise extension point in `BETA_CART_ENGINE_
  // REPORT.md` rather than worked around.
  commit(emptyCart());
}

export function saveForLater(lineId: string): void {
  ensureHydrated();
  const lines = cache.lines.map((line) => (line.id === lineId ? { ...line, savedForLater: true } : line));
  commit({ lines, updatedAt: new Date().toISOString() });
}

export function moveToCart(lineId: string): void {
  ensureHydrated();
  const lines = cache.lines.map((line) => (line.id === lineId ? { ...line, savedForLater: false } : line));
  commit({ lines, updatedAt: new Date().toISOString() });
}

export function removeSavedItem(lineId: string): void {
  ensureHydrated();
  const lines = cache.lines.filter((line) => line.id !== lineId);
  commit({ lines, updatedAt: new Date().toISOString() });
}
