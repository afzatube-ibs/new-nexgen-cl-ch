'use client';

import Link from 'next/link';
import { Button, Icon, Text } from '@nexgen/ui';
import { CartLineItemRow, CartSummary, PromoCodePlaceholder, useCart } from '@nexgen/storefront-engine/client';
import { ShoppingBag } from 'lucide-react';

/**
 * Beta Sprint 3 — Cart Engine. The `/cart` full-page fallback
 * `CUSTOMER_EXPERIENCE_ARCHITECTURE.md` §6 names alongside `CartDrawer`
 * as the primary UI — both driven by the exact same `useCart()` /
 * `cartStore.ts` state, never a second, divergent cart representation.
 * This page exists for: a shopper who lands here directly (a bookmarked
 * link, a shared URL, a browser back-button flow), and as the one place
 * a full, unhurried cart review (not a slide-over) is the better UX.
 *
 * A real Client Component page (no server data to fetch — the cart lives
 * entirely in the browser's own `localStorage`), consistent with
 * `CUSTOMER_EXPERIENCE_ARCHITECTURE.md`'s own classification: "Cart,
 * Checkout, Account | SSR | Request-specific, session/customer-specific
 * content" describes the *shape* once Category B exists; today, with no
 * backend session behind it, this is honestly a client-rendered page —
 * `robots.txt` already disallows `/cart` (`STORE_FRONTEND_ARCHITECTURE.md`
 * §1, unchanged), so this has no SEO cost.
 */
export default function CartPage() {
  const { cart, updateQuantity, removeItem, saveForLater, moveToCart, removeSavedItem } = useCart();

  const activeLines = cart.lines.filter((line) => !line.savedForLater);
  const savedLines = cart.lines.filter((line) => line.savedForLater);

  if (activeLines.length === 0 && savedLines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <Icon icon={ShoppingBag} size="standalone" className="text-text-secondary" />
        <Text as="h1" variant="display">
          Your cart is empty
        </Text>
        <Text as="p" variant="body" className="text-text-secondary">
          Items you add will show up here.
        </Text>
        <Button asChild>
          <Link href="/">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <Text as="h1" variant="display">
        Your Cart
      </Text>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col">
          <div className="flex flex-col divide-y divide-border border-y border-border">
            {activeLines.map((line) => (
              <CartLineItemRow key={line.id} line={line} onQuantityChange={updateQuantity} onRemove={removeItem} onSaveForLater={saveForLater} />
            ))}
          </div>

          {savedLines.length > 0 && (
            <div className="mt-8 flex flex-col gap-1">
              <Text as="h2" variant="heading">
                Saved for later ({savedLines.length})
              </Text>
              <div className="flex flex-col divide-y divide-border">
                {savedLines.map((line) => (
                  <CartLineItemRow key={line.id} line={line} onQuantityChange={updateQuantity} onRemove={removeSavedItem} onMoveToCart={moveToCart} />
                ))}
              </div>
            </div>
          )}
        </div>

        {activeLines.length > 0 && (
          <div className="flex h-fit flex-col gap-4 rounded-lg border border-border p-4">
            <PromoCodePlaceholder />
            <CartSummary lines={cart.lines} />
            <Button asChild size="lg">
              <Link href="/checkout">Proceed to checkout</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
