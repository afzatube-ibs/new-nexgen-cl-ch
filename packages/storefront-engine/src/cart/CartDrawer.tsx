'use client';

import Link from 'next/link';
import { Button, Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, Icon, Text } from '@nexgen/ui';
import { ShoppingBag } from 'lucide-react';
import { CartLineItemRow } from './CartLineItemRow.js';
import { CartSummary } from './CartSummary.js';
import { PromoCodePlaceholder } from './PromoCodePlaceholder.js';
import { useCart } from './useCart.js';

/**
 * Beta Sprint 3 — Cart Engine. The primary Cart UI (`CUSTOMER_EXPERIENCE_
 * ARCHITECTURE.md` §6: "`CartDrawer` (primary) + `/cart` full-page
 * fallback ... both driven by the same anonymous `localStorage` cart
 * state") — a real, fully working drawer: view lines, change quantity,
 * remove, save for later / move to cart, real subtotal (honest, see
 * `CartSummary`), and a real "Proceed to checkout" link.
 *
 * `open`/`onOpenChange` are controlled by the caller (`StoreHeader`,
 * which already owns this exact pattern for its mobile-menu `Drawer`) so
 * a future `AddToCartButton` can also open this same drawer after adding
 * an item, without this component needing its own global-open state.
 */
export interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { cart, updateQuantity, removeItem, saveForLater, moveToCart, removeSavedItem } = useCart();

  const activeLines = cart.lines.filter((line) => !line.savedForLater);
  const savedLines = cart.lines.filter((line) => line.savedForLater);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent anchor="right" width="md" aria-label="Shopping cart">
        <DrawerHeader>
          <DrawerTitle>Your Cart {activeLines.length > 0 && `(${activeLines.length})`}</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-1 flex-col overflow-y-auto">
          {activeLines.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
              <Icon icon={ShoppingBag} size="standalone" className="text-text-secondary" />
              <Text as="p" variant="body-strong" className="text-text-primary">
                Your cart is empty
              </Text>
              <Text as="p" variant="body" className="text-text-secondary">
                Items you add will show up here.
              </Text>
              <DrawerClose asChild>
                <Button asChild variant="secondary">
                  <Link href="/">Continue shopping</Link>
                </Button>
              </DrawerClose>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {activeLines.map((line) => (
                <CartLineItemRow key={line.id} line={line} onQuantityChange={updateQuantity} onRemove={removeItem} onSaveForLater={saveForLater} />
              ))}
            </div>
          )}

          {savedLines.length > 0 && (
            <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
              <Text as="p" variant="body-strong" className="text-text-primary">
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
          <div className="mt-auto flex flex-col gap-4 border-t border-border pt-4">
            <PromoCodePlaceholder />
            <CartSummary lines={cart.lines} />
            <DrawerClose asChild>
              <Button asChild size="lg">
                <Link href="/checkout">Proceed to checkout</Link>
              </Button>
            </DrawerClose>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
