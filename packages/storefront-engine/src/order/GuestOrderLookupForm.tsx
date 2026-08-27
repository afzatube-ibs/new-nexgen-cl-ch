'use client';

import { useState, type FormEvent } from 'react';
import { Calendar, Package, Search } from 'lucide-react';
import { Alert, Badge, Button, Card, CardContent, Icon, Input, Text } from '@nexgen/ui';
import { lookupOrder, CheckoutRequestError, type LookedUpOrderSummary } from '../checkout/checkoutClient.js';

/**
 * Beta Sprint 3 — Order Success Experience. Real client-side validation,
 * wired live (`/orders/lookup`) since Beta Sprint 3.
 *
 * **Beta Sprint 5 — real past that point too.** Calls the Gateway's real
 * `GET /v1/orders/lookup` (`checkoutClient.js`), which requires an exact
 * order-number + email match against the real backend before returning
 * anything (Gateway-side authorization — see `routes/orders.ts`'s own
 * docblock). A genuine mismatch and a genuinely nonexistent order number
 * return the identical, generic "not found" message here, exactly as the
 * Gateway itself deliberately makes them indistinguishable, so this form
 * never becomes a way to enumerate real orders.
 *
 * Renders a real, honestly LIGHTER summary than `OrderConfirmationSummary`
 * — the real backend's own list-mode `OrderResource` (what this lookup is
 * built on) has no line items, addresses, or timeline, only order-level
 * totals (`checkoutClient.ts`'s own `LookedUpOrderSummary` docblock);
 * showing anything more here would be fabricated, not real.
 *
 * **UX refinement pass (Sprint 5, post-wiring)** — the found-order result
 * is now a real receipt-style `Card`, the "not found"/network-error copy
 * uses the shared `Alert` component (matching `CheckoutForm`), and a real
 * `Button loading` spinner replaces the earlier manual "Searching…" text
 * swap. Presentation only — the real lookup call, its authorization
 * behavior, and the lighter summary shape above are all unchanged.
 */
export function GuestOrderLookupForm() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<LookedUpOrderSummary | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOrder(null);
    if (!orderNumber.trim() || !email.trim()) {
      setError('Enter your order number and the email you used to order.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const found = await lookupOrder(orderNumber.trim(), email.trim());
      setOrder(found);
    } catch (err) {
      if (err instanceof CheckoutRequestError && err.isNotFound) {
        setError("We couldn't find an order matching that order number and email.");
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong looking up your order. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (order) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 pt-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-brand">
                <Icon icon={Package} size="inline" />
              </span>
              <Text as="span" variant="body-strong" className="text-text-primary">
                {order.orderNumber}
              </Text>
            </div>
            <Badge variant={order.status === 'pending' ? 'warning' : 'success'}>{order.status}</Badge>
          </div>
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Icon icon={Calendar} size="inline" />
            <Text as="p" variant="caption">
              Placed {new Date(order.placedAt).toLocaleDateString()} · {order.customerName}
            </Text>
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <Text as="p" variant="body" className="text-text-secondary">
              Total
            </Text>
            <Text as="p" variant="subheading" className="text-text-primary">
              {new Intl.NumberFormat('en', { style: 'currency', currency: order.currencyCode }).format(order.grandTotal)}
            </Text>
          </div>
          <Button type="button" variant="secondary" onClick={() => setOrder(null)}>
            Look up another order
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input label="Order number" placeholder="e.g. ORD-20260821-00B278F5" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
          <Input label="Email address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && (
            <Alert variant="danger" role="alert">
              {error}
            </Alert>
          )}
          <Button type="submit" loading={loading} disabled={loading}>
            <Icon icon={Search} size="inline" />
            Track order
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
