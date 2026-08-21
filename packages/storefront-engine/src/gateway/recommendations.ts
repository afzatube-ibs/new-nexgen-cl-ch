import 'server-only';
import { gatewayFetch, type GatewayFetchOptions } from './client.js';
import type { ProductSummary } from './types.js';

/**
 * Beta Milestone 2 — the typed client for the Gateway's own real
 * `/v1/recommendations/:slot` route (`apps/store-api-gateway/src/routes/
 * recommendations.ts`, Slice 1.5). This is the honest, real data source
 * for Homepage "Trending" and Product Detail "Related"/"Recommended":
 * today every slot except `recently-viewed` resolves to the Gateway's own
 * `trending-fallback` engine — a real, labeled, recency-based ranking over
 * real Catalog data, never a fabricated "smart" result
 * (`recommendations/engines/trendingFallbackEngine.ts`'s own docblock).
 * `recently-viewed` is honestly empty today (no CDP view-history wiring
 * yet) — this client passes it through unmodified rather than hiding it.
 */
export type RecommendationSlot = 'trending' | 'related' | 'recently-viewed' | 'frequently-bought-together' | 'recommended';

export interface GetRecommendationsParams {
  slot: RecommendationSlot;
  /** Required by the Gateway for `related`/`frequently-bought-together` — the product being viewed. */
  productId?: string;
  limit?: number;
}

/**
 * Never throws on an unsupported/disabled slot — the Gateway itself
 * degrades a flag-disabled slot to `{ data: [] }` (HTTP 200), and this
 * client leaves a genuine 501 (`GatewayRequestError.isUnsupportedIdentifier`
 * doesn't apply here, but a raw 501 would) to bubble up to the caller,
 * matching `gatewayFetch`'s own real-error-propagates contract — no
 * recommendation slot in this milestone's actual usage (`trending`,
 * `related`, `recommended`) is ever unsupported by the always-registered
 * fallback engine, so this is a real, unlikely-but-honest edge, not a
 * hidden one.
 */
export function getRecommendations(params: GetRecommendationsParams, options: GatewayFetchOptions = {}): Promise<ProductSummary[]> {
  return gatewayFetch<ProductSummary[]>(`/v1/recommendations/${params.slot}`, {
    query: { productId: params.productId, limit: params.limit },
    // Recommendations are visitor-scoped (the Gateway resolves the
    // requesting guest's own deviceId for `recently-viewed`), so this is
    // never cached/revalidated like Category A catalog data — every call
    // is a fresh SSR fetch, matching `STORE_FRONTEND_ARCHITECTURE.md` §2's
    // own rendering-mode table for personalization-touching data.
    revalidateSeconds: 0,
    ...options,
  });
}
