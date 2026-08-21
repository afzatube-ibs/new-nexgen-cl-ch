import { Badge, Text } from '@nexgen/ui';
import type { Order } from './types.js';

/**
 * Beta Sprint 3 — Order Success Experience. A real, typed, presentational
 * Order Success page body — order number, real timeline, real line
 * items, real addresses, real totals — built against the exact shape
 * the real backend's `OrderResource` returns (`order/types.ts`'s own
 * docblock). A real Server Component: pure props in, markup out, no
 * client state, no fabricated data of its own.
 *
 * **Not wired to a live route** — see `ORDER_SUCCESS_ARCHITECTURE.md`
 * for exactly why: no Storefront-reachable path to a real `Order`
 * exists yet (Orders is staff-`auth:sanctum`-gated, the same Category-B
 * gap `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` names for Checkout/
 * Payments), and `CheckoutForm` (Phase C) cannot create a real order to
 * redirect here with. This is the real, ready drop-in for the day one
 * exists — the same "build the real component, name the real reason it
 * isn't live yet" pattern this engagement has followed since
 * `VariantSelector` (Beta Milestone 2.6).
 */
export interface OrderConfirmationSummaryProps {
  order: Order;
  className?: string;
}

function formatMoney(amount: string, currencyCode: string): string {
  const value = Number.parseFloat(amount);
  if (Number.isNaN(value)) return amount;
  return new Intl.NumberFormat('en', { style: 'currency', currency: currencyCode }).format(value);
}

export function OrderConfirmationSummary({ order, className }: OrderConfirmationSummaryProps) {
  const shipping = order.addresses.find((address) => address.addressType === 'shipping');

  return (
    <div className={className}>
      <div className="flex flex-col gap-1">
        <Badge variant="success" className="w-fit">
          Order confirmed
        </Badge>
        <Text as="h1" variant="display">
          Thanks, {order.customerName.split(' ')[0]}!
        </Text>
        <Text as="p" variant="body" className="text-text-secondary">
          Order {order.orderNumber} was placed on {new Date(order.placedAt).toLocaleDateString()}. A confirmation was sent to {order.customerEmail}.
        </Text>
      </div>

      <div className="mt-6 flex flex-col divide-y divide-border border-y border-border">
        {order.items.map((item) => (
          <div key={item.sku} className="flex items-center justify-between gap-4 py-3">
            <div className="flex flex-col">
              <Text as="span" variant="body-strong" className="text-text-primary">
                {item.productName}
              </Text>
              <Text as="span" variant="caption" className="text-text-secondary">
                Qty {item.quantity} · SKU {item.sku}
              </Text>
            </div>
            <Text as="span" variant="body-strong" className="text-text-primary">
              {formatMoney(item.lineSubtotal, order.currencyCode)}
            </Text>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-1 self-end text-right">
        <SummaryLine label="Subtotal" value={formatMoney(order.subtotal, order.currencyCode)} />
        {order.discountTotal !== '0.0000' && <SummaryLine label="Discount" value={`-${formatMoney(order.discountTotal, order.currencyCode)}`} />}
        <SummaryLine label="Shipping" value={formatMoney(order.shippingTotal, order.currencyCode)} />
        <SummaryLine label="Tax" value={formatMoney(order.taxTotal, order.currencyCode)} />
        <SummaryLine label="Total" value={formatMoney(order.grandTotal, order.currencyCode)} strong />
      </div>

      {shipping && (
        <div className="mt-6 flex flex-col gap-1">
          <Text as="h2" variant="heading">
            Shipping to
          </Text>
          <Text as="p" variant="body" className="text-text-secondary">
            {shipping.recipientName}
            <br />
            {shipping.addressLine1}
            {shipping.addressLine2 ? `, ${shipping.addressLine2}` : ''}
            <br />
            {shipping.city}
            {shipping.region ? `, ${shipping.region}` : ''} {shipping.postalCode ?? ''}
          </Text>
        </div>
      )}

      {order.timelineEvents.length > 0 && (
        <div className="mt-6 flex flex-col gap-1">
          <Text as="h2" variant="heading">
            Order timeline
          </Text>
          <ul className="flex flex-col gap-1">
            {order.timelineEvents.map((event) => (
              <li key={`${event.eventType}-${event.occurredAt}`} className="text-body text-text-secondary">
                {event.description} — {new Date(event.occurredAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SummaryLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3">
      <Text as="span" variant={strong ? 'body-strong' : 'body'} className="text-text-secondary">
        {label}
      </Text>
      <Text as="span" variant={strong ? 'heading' : 'body-strong'} className="text-text-primary">
        {value}
      </Text>
    </div>
  );
}
