/**
 * Beta Sprint 5 — the real Guest Checkout saga, orchestrated Gateway-side
 * in one server-to-server sequence rather than the Storefront driving
 * six separate round trips against a persisted session. Every step below
 * calls a real, already-built backend endpoint (re-verified from source
 * in `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` and this sprint's own
 * research) — this module invents no backend capability and recalculates
 * nothing the backend already owns (no price, no tax, no total is ever
 * computed here).
 *
 * **Why one orchestrated call, not a persisted multi-step session
 * (documented trade-off, not an oversight)**: the real `CheckoutSession`
 * already supports a multi-step flow (start → items → addresses →
 * shipping → review → submit), and a future iteration could let a
 * shopper resume a session across a reload by persisting the session id
 * (e.g. in a Gateway-owned, Redis-backed guest-session mapping). This
 * sprint's own `CheckoutForm` already collects everything in one "Place
 * order" submission with no intermediate review step shown to the
 * shopper, so orchestrating the full real sequence in one Gateway call
 * is the more conservative, lower-risk choice: no new session-mapping
 * subsystem, no risk of an abandoned half-filled session confusing a
 * later request, and the real backend's own 60-minute `CheckoutSession`
 * TTL already reclaims an abandoned attempt with zero Gateway-side
 * cleanup needed. The real, honest cost: a browser refresh mid-submit
 * loses the in-flight attempt (the shopper resubmits from scratch, which
 * is also the honest behavior every card charge in this saga already
 * requires: `SubmitCheckoutAction`'s own idempotency key is scoped to
 * one submission attempt, not one shopper session).
 *
 * **Payment initiation is deliberately never rolled back by an Order
 * that already exists** — this is a real, honest reflection of the real
 * backend's own architecture, not a workaround: `SubmitCheckoutAction`
 * never calls payment initiation itself (confirmed from source), so this
 * orchestrator calls it as a real, separate, final step. If it fails,
 * the Order is still real and still correct — this function returns it
 * with `payment: null` and a real, honest `paymentError`, never hides
 * the Order or fabricates a payment.
 */
import { randomUUID } from 'node:crypto';
import type { BackendClient } from '../backend/client.js';
import type { CheckoutBackendClient } from '../backend/checkoutClient.js';
import { BackendUpstreamError, GatewayError, extractBackendErrorMessage } from '../lib/errors.js';
import { resolveShippingOptions } from './shippingQuotes.js';
import type { BackendCheckoutSession, BackendEnvelope, BackendOrder, BackendPayment, SubmitCheckoutRequestBody, SubmitCheckoutResult } from './types.js';

export interface OrchestrateOptions {
  backend: CheckoutBackendClient;
  catalogBackend: BackendClient;
  correlationId: string;
}

function validateBody(body: SubmitCheckoutRequestBody): void {
  const details: Array<{ field: string; message: string }> = [];
  if (!body.email?.trim()) details.push({ field: 'email', message: 'Email is required.' });
  if (!body.name?.trim()) details.push({ field: 'name', message: 'Name is required.' });
  if (!body.currencyCode || body.currencyCode.length !== 3) details.push({ field: 'currencyCode', message: 'A 3-letter currency code is required.' });
  if (!body.address?.recipientName?.trim()) details.push({ field: 'address.recipientName', message: 'Recipient name is required.' });
  if (!body.address?.addressLine1?.trim()) details.push({ field: 'address.addressLine1', message: 'Street address is required.' });
  if (!body.address?.city?.trim()) details.push({ field: 'address.city', message: 'City is required.' });
  if (!body.address?.countryCode || !/^[A-Z]{2}$/i.test(body.address.countryCode)) {
    details.push({ field: 'address.countryCode', message: 'A 2-letter country code is required.' });
  }
  if (!body.shippingOptionId) details.push({ field: 'shippingOptionId', message: 'A shipping option is required.' });
  if (!body.paymentGatewayCode) details.push({ field: 'paymentGatewayCode', message: 'A payment method is required.' });
  if (!body.idempotencyKey) details.push({ field: 'idempotencyKey', message: 'Missing idempotency key.' });
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    details.push({ field: 'lines', message: 'Your cart is empty.' });
  } else {
    for (const [index, line] of body.lines.entries()) {
      if (!line.productId) details.push({ field: `lines.${index}.productId`, message: 'Missing product.' });
      if (!Number.isInteger(line.quantity) || line.quantity < 1) details.push({ field: `lines.${index}.quantity`, message: 'Quantity must be at least 1.' });
    }
  }
  if (details.length > 0) throw GatewayError.validation(details);
}

export async function orchestrateGuestCheckout(body: SubmitCheckoutRequestBody, options: OrchestrateOptions): Promise<SubmitCheckoutResult> {
  validateBody(body);

  const { backend, catalogBackend, correlationId } = options;
  const addressPayload = {
    recipient_name: body.address.recipientName,
    phone: body.address.phone ?? undefined,
    address_line1: body.address.addressLine1,
    address_line2: body.address.addressLine2 ?? undefined,
    city: body.address.city,
    region: body.address.region ?? undefined,
    postal_code: body.address.postalCode ?? undefined,
    country_code: body.address.countryCode.toUpperCase(),
  };

  // Step 1 — start.
  const startResponse = await backend.post<BackendEnvelope<BackendCheckoutSession>>({
    module: 'checkout',
    path: 'checkout/sessions',
    correlationId,
    body: { guest_email: body.email, guest_name: body.name, currency_code: body.currencyCode.toUpperCase() },
  });
  let session = startResponse.data;

  // Step 2 — add each real cart line. AddCheckoutItemAction resolves the
  // real sku/product_name/price from the real product_id server-side —
  // this orchestrator sends nothing else, per the real backend's own
  // contract (`AddCheckoutItemRequest` accepts only product_id/quantity/
  // expected_version, never a caller-supplied price or name).
  for (const line of body.lines) {
    await backend.post<BackendEnvelope<unknown>>({
      module: 'checkout',
      path: `checkout/sessions/${session.id}/items`,
      correlationId,
      body: { product_id: line.productId, quantity: line.quantity, expected_version: session.version },
    });
    session = { ...session, version: session.version + 1 };
  }

  // Step 3 — billing address (this form collects one address; used for both, same as most guest-checkout flows default to).
  const billingResponse = await backend.put<BackendEnvelope<BackendCheckoutSession>>({
    module: 'checkout',
    path: `checkout/sessions/${session.id}/billing-address`,
    correlationId,
    body: { ...addressPayload, expected_version: session.version },
  });
  session = billingResponse.data;

  // Step 4 — shipping address.
  const shippingAddrResponse = await backend.put<BackendEnvelope<BackendCheckoutSession>>({
    module: 'checkout',
    path: `checkout/sessions/${session.id}/shipping-address`,
    correlationId,
    body: { ...addressPayload, expected_version: session.version },
  });
  session = shippingAddrResponse.data;

  // Step 5 — shipping option. Never trusts a client-supplied amount: this
  // re-resolves the real quote for this real destination and these real
  // cart lines against Shipping's own module right now, then matches the
  // shopper's chosen `shippingOptionId` against that fresh result — the
  // exact same composition `POST /v1/checkout/shipping-options` used to
  // list options in the first place (see checkout/shippingQuotes.ts). A
  // stale or tampered id (rates changed, or the id never existed) is a
  // real, honest validation failure, not a silently-accepted number.
  const shippingOptions = await resolveShippingOptions({
    backend: catalogBackend,
    checkoutBackend: backend,
    destination: { countryCode: body.address.countryCode, region: body.address.region },
    lines: body.lines,
    correlationId,
  });
  const shippingOption = shippingOptions.find((option) => option.id === body.shippingOptionId);
  if (!shippingOption) {
    throw GatewayError.validation([{ field: 'shippingOptionId', message: 'This shipping option is no longer available for your address. Please choose another.' }]);
  }

  const shippingOptionResponse = await backend.put<BackendEnvelope<BackendCheckoutSession>>({
    module: 'checkout',
    path: `checkout/sessions/${session.id}/shipping-option`,
    correlationId,
    body: {
      shipping_method_id: shippingOption.id,
      shipping_label: shippingOption.label,
      shipping_amount: shippingOption.amount,
      currency_code: shippingOption.currencyCode,
      expected_version: session.version,
    },
  });
  session = shippingOptionResponse.data;

  // Step 6 — review (real price/tax/discount composition, computed entirely by the backend).
  const reviewResponse = await backend.post<BackendEnvelope<BackendCheckoutSession>>({
    module: 'checkout',
    path: `checkout/sessions/${session.id}/review`,
    correlationId,
    body: { expected_version: session.version },
  });
  session = reviewResponse.data;

  // Step 7 — submit. A real, new Order is created here.
  const submitResponse = await backend.post<BackendEnvelope<BackendOrder>>({
    module: 'checkout',
    path: `checkout/sessions/${session.id}/submit`,
    correlationId,
    body: { idempotency_key: body.idempotencyKey, expected_version: session.version },
  });
  const order = submitResponse.data;

  // Step 8 — initiate payment. Deliberately isolated: a failure here
  // never un-creates the real Order above (see this module's own
  // docblock).
  let payment: BackendPayment | null = null;
  let paymentError: string | null = null;
  try {
    const paymentResponse = await backend.post<BackendEnvelope<BackendPayment>>({
      module: 'payments',
      path: 'payments',
      correlationId,
      body: { order_id: order.id, gateway_code: body.paymentGatewayCode, idempotency_key: randomUUID() },
    });
    payment = paymentResponse.data;
  } catch (error) {
    // Real bug found and fixed live (this sprint's own end-to-end browser
    // verification, submitting with an unconfigured gateway like `bkash`):
    // a bare `error.message` here only ever surfaced the generic "Backend
    // payments responded 422" (`CheckoutBackendClient`'s own generic
    // upstream-error message), never the real, specific reason. Confirmed
    // live: `PaymentGatewayNotAvailable` renders through the SECOND real
    // error shape `extractBackendErrorMessage` recognizes (`{"error":
    // {"message": "Payment gateway [bkash] is not available."}}`), not
    // the field-keyed Laravel validation shape Checkout's own address
    // fields use — see that function's own docblock for the live finding.
    if (error instanceof BackendUpstreamError) {
      paymentError = extractBackendErrorMessage(error.upstreamBody) ?? error.message;
    } else {
      paymentError = error instanceof Error ? error.message : 'Payment could not be started for this order.';
    }
  }

  return { order, payment, paymentError };
}
