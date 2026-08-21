/**
 * Beta Sprint 3 — Order Success Experience. Field-for-field matched to
 * the real backend's own `Orders\Http\Resources\OrderResource` (re-
 * verified from source) — never an invented order shape. This module has
 * no live data source yet (Orders is staff-`auth:sanctum`-gated, same
 * Category-B gap as Checkout/Payments — see `ORDER_SUCCESS_ARCHITECTURE
 * .md`), so every component built against these types is real,
 * presentational, and ready, but not reachable from a real page today.
 */
export interface OrderItem {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  discountAmount: string;
  taxAmount: string;
  lineSubtotal: string;
}

export interface OrderAddress {
  addressType: 'billing' | 'shipping';
  recipientName: string;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
}

export interface OrderDiscount {
  promotionId: string | null;
  code: string | null;
  label: string;
  amount: string;
}

export interface OrderTimelineEvent {
  eventType: string;
  description: string;
  occurredAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  currencyCode: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  shippingTotal: string;
  grandTotal: string;
  status: string;
  placedAt: string;
  items: OrderItem[];
  addresses: OrderAddress[];
  discounts: OrderDiscount[];
  timelineEvents: OrderTimelineEvent[];
}
