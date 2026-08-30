/**
 * Phase 2.6 — Orders, Slice 1 (Order Management). Extends the minimal,
 * read-only shape Phase 2.5 (Customers, Slice 2) introduced for its own
 * "Recent Orders" card. Every field/endpoint here is confirmed by reading
 * `apps/backend/app/Domains/Commerce/Orders/` directly — Models,
 * Controllers, Actions, Requests, Resources, Routes — per the already-
 * approved `planning/architecture/PHASE_2_6_ORDERS_ARCHITECTURE.md`. No
 * architecture research repeated here.
 *
 * This module is READ + LIFECYCLE MANAGEMENT ONLY: no order-creation
 * capability is wrapped here (`CreateOrderAction`'s docblock and
 * `OrderController`'s own docblock both state orders are created via
 * Checkout only — see the architecture doc §2.2/§6.1), no refund/return/
 * shipment-tracking/payment-capture surface exists on this backend to wrap.
 */

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

/**
 * `Order::TRANSITIONS` (apps/backend), mirrored exactly — never invented.
 * Used only to decide which lifecycle action buttons to *render*; the
 * server is still the sole source of truth (`Order::canTransitionTo()`
 * re-checked there on every real transition call, and a stale client copy
 * of this map can only produce an honest, real 422, never a silent wrong
 * action).
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const ORDER_TARGET_TYPE = 'App\\Domains\\Commerce\\Orders\\Models\\Order';
export const ORDER_NOTE_TARGET_TYPE = 'App\\Domains\\Commerce\\Orders\\Models\\OrderNote';

export interface OrderItemDTO {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  discountAmount: string;
  taxAmount: string;
  lineSubtotal: string;
}

export type OrderAddressType = 'billing' | 'shipping';

export interface OrderAddressDTO {
  id: string;
  addressType: OrderAddressType;
  recipientName: string;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
}

export interface OrderDiscountDTO {
  id: string;
  promotionId: string | null;
  code: string | null;
  label: string;
  amount: string;
}

export interface OrderNoteDTO {
  id: string;
  authorId: string | null;
  body: string;
  isCustomerVisible: boolean;
  createdAt: string;
}

export type OrderTimelineEventType = 'order_placed' | 'status_changed' | 'note_added';

export interface OrderTimelineEventDTO {
  id: string;
  eventType: OrderTimelineEventType;
  description: string;
  occurredAt: string;
}

/**
 * The exact shape `OrderResource` returns. `items`/`addresses`/`discounts`/
 * `notes`/`timelineEvents` are Laravel `whenLoaded()` relations — present
 * only on `show()` (`$order->load([...])`, confirmed by reading
 * `OrderController::show` directly), omitted on `index()`'s own rows.
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
  items?: OrderItemDTO[];
  addresses?: OrderAddressDTO[];
  discounts?: OrderDiscountDTO[];
  notes?: OrderNoteDTO[];
  timelineEvents?: OrderTimelineEventDTO[];
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** `OrderController::index` — genuinely server-side `status`/`customer_id`/`q`, hardcoded `orderByDesc('placed_at')`, Laravel's own default (fixed per-page, no `per_page` override read at all — confirmed by reading the controller directly). */
export interface ListOrdersQuery {
  status?: OrderStatus;
  customerId?: string;
  q?: string;
  page?: number;
}

/** `OrderStatusController` — every transition but `cancel` takes only `expected_version` (`ExpectedVersionRequest`). */
export interface TransitionOrderInput {
  expectedVersion: number;
}

/** `CancelOrderRequest` — `reason` (required, `max:1000`) plus `expected_version`. */
export interface CancelOrderInput {
  reason: string;
  expectedVersion: number;
}

/** `AddOrderNoteRequest` — `body` (`max:5000`), `is_customer_visible` (`sometimes` boolean), `expected_version`. */
export interface AddOrderNoteInput {
  body: string;
  isCustomerVisible: boolean;
  expectedVersion: number;
}

/**
 * Production Completion Plan v2, Milestone 8 (Dashboard Real Widgets) —
 * `OrderMetricsController::summary`. Revenue is one entry per real
 * `currency_code` actually present in the window, never blended into one
 * number — this platform's own real order data spans more than one
 * currency, confirmed directly against the dev database, and summing
 * across currencies without a real conversion would be a fabricated
 * number, not a real one. See that controller's own docblock for the
 * exact "orders" vs. "revenue" inclusion rules (cancelled orders count as
 * placed but never as revenue).
 */
export interface CurrencyAmountDTO {
  currencyCode: string;
  amount: string;
}

export interface OrderMetricsSummaryDTO {
  pendingOrders: number;
  ordersToday: number;
  ordersThisMonth: number;
  revenueToday: CurrencyAmountDTO[];
  revenueThisMonth: CurrencyAmountDTO[];
}

/** `OrderMetricsController::topProducts` — all-time, by real total quantity sold. */
export interface TopSellingProductDTO {
  sku: string;
  productName: string;
  totalQuantity: number;
}

export interface ListTopSellingProductsQuery {
  /** Server clamps to [1, 20] regardless of what's sent — mirrored here only as documentation, never re-validated client-side. */
  limit?: number;
}

export interface OrderAuditLogDTO {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  correlationId: string | null;
  createdAt: string;
}

/** `AuditLogController::index` (Orders' own) — genuinely `actor_id`/`target_type` only, confirmed by reading it directly. No `target_id` filter exists — the identical constraint Customers' own audit endpoint has. */
export interface ListOrderAuditLogsQuery {
  targetType?: string;
  actorId?: string;
  page?: number;
  perPage?: number;
}
