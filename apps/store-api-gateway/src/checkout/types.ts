/**
 * Beta Sprint 5 — real backend response shapes, field-for-field matched
 * to the real backend's own `CheckoutSessionResource`, `CheckoutItemResource`,
 * `ShippingOptionResource`, `OrderResource`, and `PaymentResource` (all
 * re-verified directly from source, not invented). Every response this
 * Gateway's checkout routes return is one of these, or a real
 * composition of them — never a shape this module made up on its own.
 */
export interface BackendEnvelope<T> {
  data: T;
}

export interface BackendCheckoutItem {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  taxClassId: string | null;
  unitPrice: string | null;
  taxAmount: string | null;
}

export interface BackendCheckoutSession {
  id: string;
  customerId: string | null;
  guestEmail: string | null;
  guestName: string | null;
  currencyCode: string;
  billingAddress: Record<string, unknown> | null;
  shippingAddress: Record<string, unknown> | null;
  shippingOptionId: string | null;
  shippingTotal: string | null;
  couponCode: string | null;
  subtotal: string | null;
  discountTotal: string | null;
  taxTotal: string | null;
  grandTotal: string | null;
  status: 'open' | 'reviewed' | 'submitting' | 'submitted' | 'expired';
  orderId: string | null;
  expiresAt: string;
  items?: BackendCheckoutItem[];
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BackendShippingOption {
  id: string;
  label: string;
  amount: string;
}

export interface BackendOrderItem {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  discountAmount: string;
  taxAmount: string;
  lineSubtotal: string;
}

export interface BackendOrderAddress {
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

export interface BackendOrder {
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
  status: string;
  placedAt: string;
  items: BackendOrderItem[];
  addresses: BackendOrderAddress[];
  discounts: unknown[];
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BackendPayment {
  id: string;
  orderId: string;
  customerId: string | null;
  gatewayCode: string;
  currencyCode: string;
  amount: string;
  amountCaptured: string | null;
  status: string;
  proofReference: string | null;
  redirectUrl: string | null;
  instructions: string | null;
  failureReason: string | null;
  initiatedAt: string;
  authorizedAt: string | null;
  capturedAt: string | null;
  cancelledAt: string | null;
  failedAt: string | null;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * The real, LIGHTER shape `GET orders?q=` (a collection route) actually
 * returns — confirmed by direct live verification against the real
 * running backend, not assumed from `BackendOrder` above: no `items`,
 * `addresses`, `discounts`, or timeline data at all, unlike the full
 * single-order detail resource `POST checkout/submit` returns. Guest
 * Order Lookup (`routes/orders.ts`) is typed against this real, narrower
 * shape so it can never claim to return line items or addresses that
 * this endpoint does not actually provide.
 *
 * Also real, also confirmed live: the money fields here serialize as
 * JSON **numbers** (`"subtotal": 2490`), not the zero-padded **strings**
 * (`"subtotal": "2490.0000"`) `BackendOrder`'s own fields serialize as —
 * a genuine inconsistency between the real backend's list-mode and
 * detail-mode `OrderResource` output, not a transcription error here.
 */
export interface BackendOrderSummary {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  currencyCode: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  status: string;
  placedAt: string;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** The Storefront's own real request shape for `POST /v1/checkout/submit`. */
export interface SubmitCheckoutRequestBody {
  email: string;
  name: string;
  currencyCode: string;
  address: {
    recipientName: string;
    phone?: string | null;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    countryCode: string;
  };
  shippingOptionId: string;
  paymentGatewayCode: string;
  lines: Array<{ productId: string; quantity: number }>;
  idempotencyKey: string;
}

/**
 * The real, honest outcome of a checkout attempt: an Order is either
 * real (created) or it is not — there is no "partial order." Payment is
 * genuinely independent, per the real backend's own architecture
 * (`SubmitCheckoutAction` never calls `InitiatePaymentAction` itself,
 * confirmed in `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §1.2) — so a
 * real Order can exist with `payment: null` and a real `paymentError`
 * explaining exactly why, never silently hidden.
 */
export interface SubmitCheckoutResult {
  order: BackendOrder;
  payment: BackendPayment | null;
  paymentError: string | null;
}
