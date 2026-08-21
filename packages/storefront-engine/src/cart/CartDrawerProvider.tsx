'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CartDrawer } from './CartDrawer.js';

/**
 * Beta Sprint 3 — Cart Engine. A single, site-wide `CartDrawer` instance
 * (mounted once in `app/layout.tsx`, exactly like `BackToTop` already is)
 * with its open state reachable from anywhere in the tree — the header's
 * own cart icon (`StoreHeader`) and any `AddToCartButton` on any page
 * (Product Card, Product Detail, the sticky mobile buy bar) all open the
 * *same* drawer instance, rather than each needing to own a `Drawer`
 * separately or thread `open`/`onOpenChange` down as props through every
 * intermediate component.
 */
interface CartDrawerContextValue {
  openDrawer: () => void;
}

const CartDrawerContext = createContext<CartDrawerContextValue | null>(null);

export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openDrawer = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ openDrawer }), [openDrawer]);

  return (
    <CartDrawerContext.Provider value={value}>
      {children}
      <CartDrawer open={open} onOpenChange={setOpen} />
    </CartDrawerContext.Provider>
  );
}

/**
 * Returns a no-op `openDrawer` (rather than throwing) when no
 * `CartDrawerProvider` is mounted — matches this package's own "a real
 * capability degrades honestly, never crashes the page" bar, e.g. for a
 * consumer app that hasn't wired the provider in yet.
 */
export function useCartDrawerControls(): CartDrawerContextValue {
  const context = useContext(CartDrawerContext);
  return context ?? { openDrawer: () => {} };
}
