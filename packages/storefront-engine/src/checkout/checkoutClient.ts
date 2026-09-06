'use client';

/**
 * Browser client for the Store API Gateway's guest-checkout surface.
 * Every method below talks only to Gateway routes intended for shoppers;
 * backend credentials remain server-side in the Gateway.
 */
const GATEWAY_URL = process.env.NEXT_PUBLIC_STORE_API_GATEWAY_URL;
const REQUEST_TIMEOUT_MS = 8000;

export interface CheckoutPaymentMethod {
  code: string;
  label: string;
}

export interface CheckoutShippingOption {
  id: string;
  label: string;
  amount: string;
  currencyCode: string;
}

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
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'The request timed out. Please try again.'
      : 'Could not reach the server. Please check your connection and try again.';
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
 * GET /v1/checkout/payment-methods — the backend GatewayRegistry's real,
 * available-only result. Registered gateways without working credentials
 * never reach the shopper through this method.
 */
export async function fetchPaymentMethods(): Promise<CheckoutPaymentMethod[]> {
  return gatewayRequest<CheckoutPaymentMethod[]>('checkout/payment-methods', { method: 'GET' });
}

export async function fetchShippingOptions(params: FetchShippingOptionsParams): Promise<CheckoutShippingOption[]> {
  return gatewayRequest<CheckoutShippingOption[]>('checkout/shipping-options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

/**
 * POST /v1/checkout/submit — the real orchestrated guest checkout. The UI
 * now obtains paymentGatewayCode from fetchPaymentMethods rather than a
 * platform-capability constant, so an unconfigured gateway is not offered.
 */
export async function submitCheckout(body: SubmitCheckoutRequestBody): Promise<SubmitCheckoutResult> {
  return gatewayRequest<SubmitCheckoutResult>('checkout/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function lookupOrder(orderNumber: string, email: string): Promise<LookedUpOrderSummary> {
  const query = new URLSearchParams({ orderNumber, email });
  return gatewayRequest<LookedUpOrderSummary>(`orders/lookup?${query.toString()}`, { method: 'GET' });
}

export const LAST_ORDER_STORAGE_KEY = 'nx_last_order';
