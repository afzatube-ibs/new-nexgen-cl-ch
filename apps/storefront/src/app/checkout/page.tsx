'use client';

import { CheckoutForm } from '@nexgen/storefront-engine/client';

/**
 * Beta Sprint 3 — Checkout Engine. `/checkout` — the exact honest
 * boundary `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` and
 * `BETA_CHECKOUT_ENGINE_REPORT.md` describe: a real, fully-built,
 * fully-validated checkout form (`CheckoutForm`, see its own docblock)
 * that cannot place a real order today because no guest-facing backend
 * path exists yet (Category B). `robots.txt` already disallows
 * `/checkout` (`STORE_FRONTEND_ARCHITECTURE.md` §1, unchanged), so this
 * carries no SEO cost either way.
 *
 * A Client Component page — no server data to fetch (the cart this form
 * reads lives in `localStorage`, same reasoning as `/cart`).
 */
export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <CheckoutForm />
    </div>
  );
}
