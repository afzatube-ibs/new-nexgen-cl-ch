'use client';

/**
 * neXgen Production Sprint — Milestone 2 completion (Search UX
 * Foundation, finished). `SearchOverlay.tsx`'s own prior docblock named
 * this exact gap: the real Gateway `GET /v1/search` route already
 * existed, price-composed this same milestone, but was never called from
 * the Storefront. This is the real, client-safe fetch path for it —
 * same direct-`fetch`/`NEXT_PUBLIC_STORE_API_GATEWAY_URL` pattern
 * `checkout/checkoutClient.ts` already established (real CORS +
 * credentials already configured on that route), and deliberately
 * self-contained (no import from `gateway/*.ts`) for the identical
 * reason that file's own docblock documents: a Client Component's RSC
 * boundary analysis walks its entire reachable module graph, and
 * `gateway/client.ts` imports `server-only`.
 */
import type { ComposedPrice } from '../gateway/types.js';

const GATEWAY_URL = process.env.NEXT_PUBLIC_STORE_API_GATEWAY_URL;
const REQUEST_TIMEOUT_MS = 8000;

/** A direct mirror of the real Gateway's own `SearchResultSummary` — see that type's own docblock (`gateway/types.ts`) for why it is honestly narrower than a full `ProductSummary`. */
export interface SearchResult {
  id: string;
  name: string;
  sku: string;
  brandId: string | null;
  publishedAt: string | null;
  relevanceScore: number | null;
  price: ComposedPrice | null;
}

export class SearchRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'SearchRequestError';
    this.status = status;
  }
}

function isConfigured(): boolean {
  return Boolean(GATEWAY_URL) && typeof window !== 'undefined' && typeof fetch === 'function';
}

/**
 * Real search — never a silent no-op. An unconfigured Gateway URL or a
 * genuine network failure both throw a real, specific `SearchRequestError`
 * (`SearchOverlay`/the `/search` page decide how to render that honestly);
 * an empty `data` array is a real, successful "no matches," not an error.
 */
export async function searchProducts(query: string, options: { signal?: AbortSignal } = {}): Promise<SearchResult[]> {
  if (!isConfigured()) {
    throw new SearchRequestError(503, 'Search is not available in this environment right now.');
  }
  if (!query.trim()) return [];

  const url = `${(GATEWAY_URL as string).replace(/\/+$/, '')}/v1/search?q=${encodeURIComponent(query.trim())}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  options.signal?.addEventListener('abort', () => controller.abort());

  let response: Response;
  try {
    response = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' }, signal: controller.signal });
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError' && options.signal?.aborted) {
      // A caller-initiated abort (e.g. a newer keystroke superseding this
      // request) is not a real error to surface — the caller already
      // knows it cancelled this one.
      throw error;
    }
    const message = error instanceof Error && error.name === 'AbortError' ? 'The search request timed out. Please try again.' : 'Could not reach the server. Please check your connection and try again.';
    throw new SearchRequestError(0, message);
  }
  clearTimeout(timeout);

  if (!response.ok) {
    throw new SearchRequestError(response.status, `Search failed with status ${response.status}`);
  }

  const envelope = (await response.json()) as { data: SearchResult[] };
  return envelope.data;
}
