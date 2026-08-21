'use client';

/**
 * Beta Sprint 3 — Commerce Engine, Cart Engine analytics hooks. A real
 * client for a real, already-built, already-registered capability: the
 * Store API Gateway's own `POST /v1/events` endpoint (`apps/store-api-
 * gateway/src/routes/events.ts`, whose own docblock names it "the Browser
 * → Gateway ingestion endpoint" — direct browser calls are its intended
 * design, not a workaround), backed by a real Zod-validated event-name
 * registry (`apps/store-api-gateway/src/events/schemas.ts`) and forwarded
 * into the real Event Pipeline (webhook/warehouse/CDP destinations).
 *
 * **Only event names actually registered in that schema file are used
 * anywhere in this package** — `added_to_cart`, `removed_from_cart`,
 * `checkout_started`, `checkout_completed`, `checkout_abandoned`,
 * `product_viewed`, `category_viewed`, `search_performed`, `page_viewed`.
 * Calling this with any other name would be rejected by the Gateway's own
 * `UnknownEventNameError` — this module's own `TrackEventInput['name']`
 * union is intentionally narrowed to match, so an attempt to invent a new
 * event name (e.g. a `cart_cleared` this package has no registered schema
 * for) is a compile-time error here, not a silent runtime 422 discovered
 * later. Extending the vocabulary is a two-file change (the Gateway's own
 * registry, then this union) — never a client-side invention.
 *
 * `NEXT_PUBLIC_STORE_API_GATEWAY_URL` is a **new**, deliberately distinct
 * env var from the existing `STORE_API_GATEWAY_URL` (server-only, used by
 * `gateway/client.ts` for Category-A reads) — the Gateway's own CORS
 * configuration (`apps/store-api-gateway/src/plugins/security.ts`,
 * `credentials: true`, already scoped to the Storefront's own origin via
 * `CORS_ALLOWED_ORIGINS`) and cookie-based guest-identity resolution
 * (`plugins/context.ts`) were already built for exactly this: a direct
 * browser call, cookies included, no separate Storefront-side proxy hop.
 * Not configuring this var is a safe, honest no-op (see below), never a
 * thrown error — a Storefront deployment that has not yet set it simply
 * emits no events, exactly like every other "real capability, honestly
 * absent until configured" pattern already established in this package.
 */
const GATEWAY_URL = process.env.NEXT_PUBLIC_STORE_API_GATEWAY_URL;

export type KnownEventName =
  | 'page_viewed'
  | 'product_viewed'
  | 'category_viewed'
  | 'search_performed'
  | 'added_to_cart'
  | 'removed_from_cart'
  | 'checkout_started'
  | 'checkout_completed'
  | 'checkout_abandoned';

export interface TrackEventInput {
  name: KnownEventName;
  properties?: Record<string, unknown>;
}

/**
 * Fire-and-forget by design — matches this platform's own "analytics must
 * never break the shopping experience" bar (the same reasoning
 * `ViewTracker.tsx` already applies to `recordRecentlyViewed`, extended
 * here to a real network call rather than only a `localStorage` write).
 * Never throws; a network failure, a missing `GATEWAY_URL`, or a rejected
 * event is swallowed, not surfaced to the caller or the shopper.
 */
export function trackEvent(input: TrackEventInput): void {
  if (!GATEWAY_URL || typeof window === 'undefined' || typeof fetch !== 'function') return;

  const url = `${GATEWAY_URL.replace(/\/+$/, '')}/v1/events`;

  void fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: input.name, source: 'browser', properties: input.properties ?? {} }),
    // Lets the request complete even if the page is about to navigate
    // (e.g. `checkout_started` fired immediately before routing to
    // `/checkout`) — the standard `fetch` equivalent of `navigator.
    // sendBeacon`, chosen over `sendBeacon` itself because this request
    // needs a JSON content-type and `credentials: 'include'`, neither of
    // which `sendBeacon` supports.
    keepalive: true,
  }).catch(() => {
    // See docblock: analytics failures are always silent.
  });
}
