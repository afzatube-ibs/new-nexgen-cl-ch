import 'server-only';
import { GatewayRequestError } from './errors.js';
import type { GatewayEnvelope, GatewayErrorBody, PaginationMeta } from './types.js';

/**
 * The ONLY path this app ever reaches the real backend through —
 * `STORE_API_GATEWAY_ARCHITECTURE.md` §1's own "the Storefront MUST NEVER
 * expose internal commerce APIs directly," enforced here structurally: this
 * module knows exactly one origin (`GATEWAY_BASE_URL`), never the real
 * backend's own URL, which this app's own `.env` never even contains.
 *
 * `import 'server-only'` makes an accidental client-bundle import of this
 * module a build-time error, not a runtime leak — this is what actually
 * keeps `GATEWAY_BASE_URL` (and, if it were ever mistakenly added here, a
 * credential) out of the browser bundle, not just a naming convention.
 *
 * **Beta Milestone 2 — implements `STOREFRONT_FOUNDATION_ARCHITECTURE_
 * REVIEW.md` §1.4's own recommendation**: a bounded, explicit request
 * timeout and a single retry on network failure (never on a real HTTP
 * error status — retrying a genuine 4xx/5xx would just hammer a struggling
 * Gateway harder). This is the same "cold TCP connection or one dropped
 * packet should not become a full page failure" resilience posture that
 * review names as standard at Shopify's own real scale.
 */

const GATEWAY_BASE_URL = process.env.STORE_API_GATEWAY_URL ?? 'http://127.0.0.1:4000';
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Next.js augments the global `fetch`'s own `RequestInit` with a `next`
 * option (`{ revalidate, tags }`) — real, and how this module implements
 * ISR/cache-tagging — but that augmentation lives in Next's own
 * `next-env.d.ts`, which this package (compiled standalone, not as part of
 * `apps/storefront`'s own TS program) does not include. Declaring the real
 * shape locally is the correct fix, not a suppression: `apps/storefront`'s
 * own build additionally benefits from Next's own stricter typing of this
 * same field when it typechecks this file as part of its program.
 */
type FetchRequestInitWithNext = RequestInit & {
  next?: { revalidate?: number; tags?: string[] };
};

export interface GatewayFetchOptions {
  /** Query string params — `undefined`/`null` values are dropped, never sent as the literal string `"undefined"`. */
  query?: Record<string, string | number | undefined | null>;
  /**
   * The incoming request's own `Cookie` header, forwarded so the Gateway's
   * guest-session plugin sees the SAME visitor across requests
   * (`context/guestSession.ts`'s own `nx_did` cookie) rather than minting a
   * new anonymous identity on every server-side fetch. Callers read this via
   * `next/headers`'s `cookies()` — this module takes it as a plain string so
   * it stays framework-call-site-agnostic and independently testable.
   */
  cookie?: string;
  /** Next.js Data Cache revalidation window, in seconds — the concrete ISR mechanism `STORE_FRONTEND_ARCHITECTURE.md` §2/§4 specifies. `0` opts out of the cache entirely (SSR). */
  revalidateSeconds?: number;
  /** Next.js cache tags — mirrors the Gateway's own cache-tag vocabulary (`catalog:products`, `catalog:category:{id}`, ...) so a future `revalidateTag` webhook (named, not built — `STORE_FRONTEND_ARCHITECTURE.md` §4 item 1) invalidates both layers with the same tag name, not two parallel tagging schemes. */
  tags?: string[];
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/**
 * A single, bounded fetch attempt — never itself retries. Times out via
 * `AbortController` rather than trusting the platform's own (often very
 * long or absent) default. A timeout is reported to the caller identically
 * to a network failure (`TypeError`), so `fetchEnvelopeWithRetry`'s own
 * retry logic treats both the same way, per this file's own docblock.
 */
async function attemptFetch<T>(url: string, requestInit: FetchRequestInitWithNext): Promise<GatewayEnvelope<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...requestInit, signal: controller.signal });

    // Beta Milestone 2 — implements STOREFRONT_FOUNDATION_ARCHITECTURE_
    // REVIEW.md §3.3's own recommendation: surface the Gateway's own real
    // X-Cache-Status (HIT/MISS/STALE) somewhere observable. A full metrics
    // pipeline is real future work; a structured, dev-only console log is
    // the honest, cheap version of this that ships today — never fabricated,
    // and silent in production so it never becomes log noise at real
    // traffic volume.
    if (process.env.NODE_ENV !== 'production') {
      const cacheStatus = response.headers.get('x-cache-status');
      if (cacheStatus) {
        console.debug(`[gateway] ${cacheStatus} ${url}`);
      }
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => undefined)) as GatewayErrorBody | undefined;
      throw new GatewayRequestError(response.status, body);
    }

    return (await response.json()) as GatewayEnvelope<T>;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchEnvelope<T>(path: string, options: GatewayFetchOptions): Promise<GatewayEnvelope<T>> {
  const url = new URL(path.replace(/^\/+/, ''), `${GATEWAY_BASE_URL}/`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.cookie) headers.cookie = options.cookie;

  const requestInit: FetchRequestInitWithNext = {
    headers,
    next: { revalidate: options.revalidateSeconds, tags: options.tags },
  };

  try {
    return await attemptFetch<T>(url.toString(), requestInit);
  } catch (error) {
    // A real GatewayRequestError (the Gateway responded, just with a
    // failure status) is never retried — retrying a genuine 4xx/5xx would
    // only add load to an already-struggling or correctly-rejecting
    // Gateway. Only a network-level failure (connection refused, DNS,
    // or this module's own explicit timeout above) gets one retry.
    if (error instanceof GatewayRequestError) throw error;
    if (!(error instanceof TypeError) && !isAbortError(error)) throw error;
    return attemptFetch<T>(url.toString(), requestInit);
  }
}

/** For a single-item route (`/v1/products/:id`, `/v1/homepage`, ...) — unwraps and returns only `envelope.data`, per the real Gateway response shape (`lib/responseEnvelope.ts::SuccessEnvelope`). */
async function gatewayFetch<T>(path: string, options: GatewayFetchOptions = {}): Promise<T> {
  const envelope = await fetchEnvelope<T>(path, options);
  return envelope.data;
}

/**
 * For a list route (`/v1/categories`, `/v1/brands`, `/v1/products`, ...).
 * **Real bug found and fixed live, during Beta Milestone 1's own production
 * build** (`next build`'s `/sitemap.xml` prerender step crashed with
 * "Cannot read properties of undefined (reading 'map')"): the real
 * Gateway's own list-route envelope is `{ data: T[], meta: { pagination,
 * ... } }` — `pagination` lives on `meta`, never nested inside `data`
 * (confirmed by direct code read, `apps/store-api-gateway/src/lib/
 * responseEnvelope.ts`). `gateway/catalog.ts`'s list functions originally
 * called the single-item `gatewayFetch<ListResult<T>>(...)`, which
 * silently returned the real `T[]` mistyped as `ListResult<T>` — `.data`
 * on that array was `undefined`, and `.pagination` was discarded
 * entirely. This function reads `envelope.data` and `envelope.meta.
 * pagination` from their real, separate locations.
 */
async function gatewayFetchList<T>(path: string, options: GatewayFetchOptions = {}): Promise<{ data: T[]; pagination?: PaginationMeta }> {
  const envelope = await fetchEnvelope<T[]>(path, options);
  return { data: envelope.data, pagination: envelope.meta.pagination };
}

export { gatewayFetch, gatewayFetchList };
