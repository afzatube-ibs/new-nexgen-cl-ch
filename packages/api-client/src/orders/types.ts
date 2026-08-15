/**
 * Phase 2.5 — Customers, Slice 2. Minimal, read-only — this is Orders'
 * real `GET /orders` list contract only (`OrderController::index`,
 * confirmed by reading it directly), consumed here strictly to power a
 * "Recent Orders" section scoped to one customer via its own genuinely
 * server-supported `customer_id` filter. No Orders module, no Order
 * detail/create/status-transition capability is built — those are a
 * distinct module this slice's own brief never asked for.
 */

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

/**
 * The exact shape `OrderResource` returns from `index()` — `items`/
 * `addresses`/`discounts`/`notes`/`timelineEvents` are Laravel `whenLoaded()`
 * relations, present only on `show()` (`$order->load([...])`), so they're
 * omitted here rather than typed as always-present empty arrays.
 */
export interface OrderDTO {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  currencyCode: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  shippingTotal: string;
  grandTotal: string;
  status: OrderStatus;
  placedAt: string;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** `OrderController::index` — genuinely server-side `status`/`customer_id`/`q`, hardcoded `orderByDesc('placed_at')`, Laravel's own default (fixed 15-per-page, no `per_page` override read at all — confirmed by reading the controller directly). */
export interface ListOrdersQuery {
  status?: OrderStatus;
  customerId?: string;
  q?: string;
  page?: number;
}
