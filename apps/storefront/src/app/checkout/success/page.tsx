'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, PackageSearch } from 'lucide-react';
import { Alert, Badge, Button, Card, CardContent, Skeleton, Text } from '@nexgen/ui';
import { OrderConfirmationSummary, LAST_ORDER_STORAGE_KEY, type SubmitCheckoutResult } from '@nexgen/storefront-engine/client';

/**
 * Beta Sprint 5 — the real Order Success page. A **Client Component**,
 * deliberately — the real `SubmitCheckoutResult` this page renders only
 * ever exists in the browser's own `sessionStorage`, written by
 * `CheckoutForm.tsx` moments before it calls `router.push('/checkout/
 * success')` (real Sprint 5 goal 5). There is no guest-reachable "fetch a
 * real Order by its raw id" route on the real backend or the Gateway
 * (Guest Order Lookup, `/orders/lookup`, is deliberately narrower — see
 * its own docblock — it requires the order number AND email, by design,
 * to prevent enumeration), so a `/checkout/success/[id]` Server Component
 * that re-fetches on load is not a real, honest option today. `sessionStorage`
 * (not `localStorage`) is deliberate too: this page's data should not
 * outlive the tab/session it was placed in.
 *
 * Read once — `sessionStorage.removeItem` after a successful read — so a
 * page refresh here (or navigating back to `/checkout/success` later)
 * shows the same honest "nothing to show" fallback a direct, un-referred
 * visit would, rather than re-displaying a stale order indefinitely.
 *
 * **Real bug found and fixed live** (this sprint's own browser
 * verification): `next.config.mjs` sets `reactStrictMode: true`, which
 * double-invokes a mount's `useEffect` in development — the real order
 * was placed and its data written to `sessionStorage`, but a naive
 * read-then-remove effect read it correctly on the FIRST invocation, then
 * found it already gone on React's own immediate second invocation,
 * overwriting the correct state with the "nothing to show" fallback
 * before this page ever rendered. `hasReadRef` guards the actual read to
 * the real first invocation only — refs, unlike a plain effect body,
 * survive Strict Mode's simulated remount, which is exactly why this is
 * the documented fix for this class of bug, not a workaround.
 *
 * Imports everything from `@nexgen/storefront-engine/client`, never the
 * main barrel — this file is a Client Component, and the main barrel
 * transitively reaches `gateway/client.ts`'s own `import 'server-only'`
 * (see `packages/storefront-engine/src/client.ts`'s own docblock for the
 * real `next build` failure this avoids).
 *
 * **UX refinement pass (Sprint 5, post-wiring)** — the real order now
 * reads as a receipt Card behind a real success-checkmark accent, payment
 * status/failure use the shared `Alert` component (matching `CheckoutForm`
 * and every other polished Storefront screen) instead of a bespoke bordered
 * div, and the brief pre-hydration instant no longer flashes blank white —
 * it shows a real `Skeleton` shaped like the content about to appear.
 * Presentation only: the real order/payment data, the `sessionStorage`
 * contract, and the Strict-Mode fix above are all unchanged.
 */
export default function CheckoutSuccessPage() {
  const [result, setResult] = useState<SubmitCheckoutResult | null | undefined>(undefined);
  const hasReadRef = useRef(false);

  useEffect(() => {
    if (hasReadRef.current) return;
    hasReadRef.current = true;
    if (typeof window === 'undefined') return;
    const raw = window.sessionStorage.getItem(LAST_ORDER_STORAGE_KEY);
    window.sessionStorage.removeItem(LAST_ORDER_STORAGE_KEY);
    if (!raw) {
      setResult(null);
      return;
    }
    try {
      setResult(JSON.parse(raw) as SubmitCheckoutResult);
    } catch {
      setResult(null);
    }
  }, []);

  // Real, brief loading state — `sessionStorage` is only readable
  // client-side, so the very first render (before `useEffect` runs) never
  // knows yet. Shaped like the real content below, not a blank flash.
  if (result === undefined) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Skeleton shape="block" className="h-40 w-full" />
        <Skeleton shape="block" className="h-24 w-full" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle text-text-secondary">
          <PackageSearch className="size-6" aria-hidden="true" />
        </span>
        <Text as="h1" variant="heading">
          No recent order found
        </Text>
        <Text as="p" variant="body" className="max-w-sm text-text-secondary">
          This page only shows an order right after you place it. If you already placed an order, you can look it up with your order number and email.
        </Text>
        <div className="mt-2 flex gap-3">
          <Button asChild variant="secondary">
            <Link href="/orders/lookup">Track an order</Link>
          </Button>
          <Button asChild>
            <Link href="/">Continue shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { order, payment, paymentError } = result;

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-feedback-success/10 text-feedback-success">
        <CheckCircle2 className="size-8" aria-hidden="true" />
      </span>

      <Card className="w-full">
        <CardContent className="pt-4">
          <OrderConfirmationSummary order={order} />
        </CardContent>
      </Card>

      {payment && (
        <Alert variant={payment.status === 'pending' ? 'warning' : 'success'} title={`Payment ${payment.status}`} className="w-full">
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className="w-fit">
              via {payment.gatewayCode}
            </Badge>
            {payment.instructions && <Text as="p" variant="body">{payment.instructions}</Text>}
          </div>
        </Alert>
      )}

      {paymentError && (
        <Alert variant="danger" title="Your order was placed, but payment couldn't be started" className="w-full">
          {paymentError} Your order ({order.orderNumber}) is real and confirmed — please contact support with your order number to complete payment.
        </Alert>
      )}

      <Button asChild variant="secondary">
        <Link href="/">Continue shopping</Link>
      </Button>
    </div>
  );
}
