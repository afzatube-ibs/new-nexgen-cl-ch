/**
 * Beta Sprint 3 — Cart Engine. Real types for a real, fully client-side
 * cart — see `cartStore.ts`'s own docblock for why this is the
 * architecturally correct shape today (`COMMERCE_ENGINE_ARCHITECTURE_
 * REVIEW.md` §7, citing `STORE_FRONTEND_ARCHITECTURE.md` §3.3 and
 * `STORE_API_GATEWAY_ARCHITECTURE.md` §2.2, both already-Accepted).
 */
export interface CartLine {
  /**
   * Stable per-line identity. Equal to `productId` today — this
   * Storefront has no real variant/SKU-switching data yet
   * (`VariantSelector` is built but unwired, Beta Milestone 2.6's own
   * report). The moment real variant data exists, this becomes
   * `${productId}:${variantId}` — the one seam that changes; nothing else
   * in this module's shape does.
   */
  id: string;
  productId: string;
  sku: string | null;
  name: string;
  href: string;
  imageSrc: string | null;
  /**
   * The real unit price the Gateway resolved for this product, in its
   * own currency — `null` today for every real product on this
   * Storefront, since no Pricing route is composed from the Gateway yet
   * (`LAUNCH_BLOCKER_STATUS.md`). Never a fabricated number: a `null`
   * price renders as an honest "Price unavailable" everywhere this line
   * is shown, exactly like `PriceBlock` already does on the Product
   * Detail page.
   */
  unitPrice: number | null;
  currencyCode: string | null;
  quantity: number;
  /** Saved-for-later lines are real cart data, just excluded from the active count/summary — see `cartStore.ts`'s `saveForLater`/`moveToCart`. */
  savedForLater: boolean;
  addedAt: string;
}

export interface Cart {
  lines: CartLine[];
  updatedAt: string;
}

export interface AddItemInput {
  productId: string;
  sku?: string | null;
  name: string;
  href: string;
  imageSrc?: string | null;
  unitPrice?: number | null;
  currencyCode?: string | null;
  quantity?: number;
}
