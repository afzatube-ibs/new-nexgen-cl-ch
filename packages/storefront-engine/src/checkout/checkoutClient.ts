'use client';

/**
 * Beta Sprint 5 — the Storefront's own real client for the Gateway's new,
 * real, write-capable Guest Checkout surface (`apps/store-api-gateway/src/
 * routes/checkout.ts` + `routes/orders.ts`). Same `NEXT_PUBLIC_STORE_API_
 * GATEWAY_URL` / direct-browser-call pattern `analytics/trackEvent.ts`
 * already established — a real Gateway route designed for exactly this
 * (CORS + credentials already configured), not a workaround.
 *
 * Deliberately self-contained — no import from `gateway/*.ts` anywhere in
 * this file, matching `client.ts`'s own "genuinely client-only" rule for
 * everything in this package's client-only barrel (see that file's own
 * docblock for the real `next build` failure this rule prevents).
 *
 * Every type below is a direct mirror of the Gateway's own real response
 * shape (`apps/store-api-gateway/src/checkout/types.ts`, re-verified from
 * source, and — for the order/payment shapes — against a real, live
 * response captured while verifying this sprint's end-to-end flow), never
 * invented.
 */

const GATEWAY_URL = process.env.NEXT_PUBLIC_STORE_API_GATEWAY_URL;
const REQUEST_TIMEOUT_MS = 8000;

/** The real backend's only two payment gateways with a working `isAvailable()` in THIS installation (no bKash/Nagad/SSLCommerz credentials are configured) — see this module's own `submitCheckout` docblock. Other `PaymentMethodId`s remain selectable in the UI (they are real, backend-implemented gateways) but will honestly fail at initiation here, exactly like they would on the real backend itself. */
export const LIVE_PAYMENT_GATEWAYS = ['cod', 'banktransfer'] as const;

export interface CheckoutShippingOption {
  id: string;
  label: string;
  amount: string;
  currencyCode: string;
}

/** `POST /v1/checkout/shipping-options`'s real request shape — a real destination and real cart lines, since the real quote is destination- and weight-aware (see the Gateway's own `checkout/shippingQuotes.ts` docblock). */
export interface FetchShippingOptionsParams {
  countryCode: string;
  region?: string | null;
  lines: Array<{ productId: string; quantity: number }>;
}

export interface CheckoutSubmitAddress {
  recipientName: string;
  phone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  region?: string | null;
  postalCode?: string | null;
  countryCode: string;
}

/** Field-for-field matched to `apps/store-api-gateway/src/checkout/types.ts`'s own `SubmitCheckoutRequestBody`. */
export interface SubmitCheckoutRequestBody {
  email: string;
  name: string;
  currencyCode: string;
  address: CheckoutSubmitAddress;
  shippingOptionId: string;
  paymentGatewayCode: string;
  lines: Array<{ productId: string; quantity: number }>;
  idempotencyKey: string;
}

export interface CheckoutOrderItem {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  discountAmount: string;
  taxAmount: string;
  lineSubtotal: string;
}

export interface CheckoutOrderAddress {
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

export interface CheckoutOrderDiscount {
  promotionId: string | null;
  code: string | null;
  label: string;
  amount: string;
}

/** The real, full single-order detail shape `POST /v1/checkout/submit` returns — matches the main barrel's own `Order` (`order/types.js`) field-for-field (deliberately identical, so a `SubmittedOrder` is assignable directly to `OrderConfirmationSummary`'s `order` prop), kept as a separate local type here only so this genuinely client-only module never imports the main barrel (see this file's own docblock). */
export interface SubmittedOrder {
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
  items: CheckoutOrderItem[];
  addresses: CheckoutOrderAddress[];
  discounts: CheckoutOrderDiscount[];
  timelineEvents: Array<{ eventType: string; description: string; occurredAt: string }>;
}

export interface CheckoutPayment {
  id: string;
  orderId: string;
  gatewayCode: string;
  currencyCode: string;
  amount: string;
  status: string;
  instructions: string | null;
  failureReason: string | null;
}

export interface SubmitCheckoutResult {
  order: SubmittedOrder;
  payment: CheckoutPayment | null;
  paymentError: string | null;
}

/**
 * The real, LIGHTER shape Guest Order Lookup returns — confirmed live
 * against the real backend (`GET orders?q=` is a collection route: no
 * `items`/`addresses`/`timelineEvents` at all, and its money fields
 * serialize as JSON numbers, not the zero-padded strings the full detail
 * resource above returns) — see the Gateway's own `BackendOrderSummary`
 * docblock for the exact same finding on that side. Never rendered
 * through `OrderConfirmationSummary`, which requires fields this shape
 * genuinely does not have.
 */
export interface LookedUpOrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  currencyCode: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  status: string;
  placedAt: string;
}

interface GatewayErrorEnvelope {
  error: { code: string; message: string; details?: Array<{ field: string; message: string }> };
  meta: { requestId: string };
}

/** A structured Gateway failure — deliberately a separate, local class from `gateway/errors.ts`'s own `GatewayRequestError`, for the same "no gateway/*.ts import in this genuinely client-only module" reason named in this file's own docblock. */
export class CheckoutRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Array<{ field: string; message: string }> | undefined;

  constructor(status: number, body: GatewayErrorEnvelope | undefined) {
    super(body?.error.message ?? `Checkout request failed with status ${status}`);
    this.name = 'CheckoutRequestError';
    this.status = status;
    this.code = body?.error.code ?? 'unknown_error';
    this.details = body?.error.details;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

function isConfigured(): boolean {
  return Boolean(GATEWAY_URL) && typeof window !== 'undefined' && typeof fetch === 'function';
}

async function gatewayRequest<T>(path: string, init: RequestInit): Promise<T> {
  if (!isConfigured()) {
    // Same "real capability, honestly absent until configured" pattern
    // `trackEvent.ts` already established — a Storefront deployment that
    // has not set `NEXT_PUBLIC_STORE_API_GATEWAY_URL` cannot reach any
    // Gateway route, checkout included; this is reported as a real,
    // specific error, never a silent no-op, since (unlike analytics) a
    // failed checkout submission must never be swallowed.
    throw new CheckoutRequestError(503, {
      error: { code: 'upstream_unavailable', message: 'Checkout is not available in this environment right now.' },
      meta: { requestId: 'unconfigured' },
    });
  }

  const url = `${(GATEWAY_URL as string).replace(/\/+$/, '')}/v1/${path.replace(/^\/+/, '')}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: 'include',
      headers: { Accept: 'application/json', ...init.headers },
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    const message = error instanceof Error && error.name === 'AbortError' ? 'The request timed out. Please try again.' : 'Could not reach the server. Please check your connection and try again.';
    throw new CheckoutRequestError(0, { error: { code: 'network_error', message }, meta: { requestId: 'network' } });
  }
  clearTimeout(timeout);

  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as GatewayErrorEnvelope | undefined;
    throw new CheckoutRequestError(response.status, body);
  }

  const envelope = (await response.json()) as { data: T };
  return envelope.data;
}

/**
 * `POST /v1/checkout/shipping-options` — real, destination- and
 * weight-aware options composed from Catalog's real per-product weight
 * and Shipping's real, multi-method quote endpoint. Returns an honest
 * empty list (never a thrown error, never a guessed rate) when no real
 * option currently covers this destination/cart — see the Gateway's own
 * `checkout/shippingQuotes.ts` docblock for the full honest-empty
 * rationale, including the named "product has no weight recorded yet"
 * case.
 */
export async function fetchShippingOptions(params: FetchShippingOptionsParams): Promise<CheckoutShippingOption[]> {
  return gatewayRequest<CheckoutShippingOption[]>('checkout/shipping-options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

/**
 * `POST /v1/checkout/submit` — the real, orchestrated 8-step Guest
 * Checkout saga. `body.paymentGatewayCode` outside `LIVE_PAYMENT_GATEWAYS`
 * (bKash/Nagad/SSLCommerz — real backend gateways, but not configured with
 * real credentials in this installation) will still create a real Order;
 * only `result.payment` comes back `null` with a real, honest
 * `result.paymentError` explaining why — never thrown as a request
 * failure, since the order itself succeeded (see the Gateway's own
 * `orchestrator.ts` docblock).
 */
export async function submitCheckout(body: SubmitCheckoutRequestBody): Promise<SubmitCheckoutResult> {
  return gatewayRequest<SubmitCheckoutResult>('checkout/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** `GET /v1/orders/lookup` — real Guest Order Lookup; requires an exact order-number + email match (Gateway-side authorization, prevents enumeration — see `routes/orders.ts`'s own docblock). Throws `CheckoutRequestError` with `isNotFound === true` on any mismatch, identical to a genuinely nonexistent order number. */
export async function lookupOrder(orderNumber: string, email: string): Promise<LookedUpOrderSummary> {
  const query = new URLSearchParams({ orderNumber, email });
  return gatewayRequest<LookedUpOrderSummary>(`orders/lookup?${query.toString()}`, { method: 'GET' });
}

/** The one `sessionStorage` key `CheckoutForm` writes the real, just-returned `SubmitCheckoutResult` to before redirecting to `/checkout/success` — see that page's own docblock for why `sessionStorage`, not a fetch-by-id route, is the honest mechanism here. */
export const LAST_ORDER_STORAGE_KEY = 'nx_last_order';
