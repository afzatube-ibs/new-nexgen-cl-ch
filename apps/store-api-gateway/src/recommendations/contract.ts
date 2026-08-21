/**
 * RecommendationEngineContract — this slice's own explicit requirement:
 * "Prepare contracts only... Leave recommendation engine pluggable. No
 * hardcoded algorithm." The same Factory/Registry/Resolver discipline as
 * `destinations/registry.ts` — a real algorithm is a future, swappable
 * implementation of this one interface, never a rewrite of the routes
 * that call it.
 */
import type { ProductSummary } from '../composition/mappers.js';

export type RecommendationSlot = 'trending' | 'related' | 'recently-viewed' | 'frequently-bought-together' | 'recommended';

export interface RecommendationRequest {
  slot: RecommendationSlot;
  /** Required for 'related'/'frequently-bought-together' (recommendations FOR a specific product); absent for store-wide slots like 'trending'. */
  productId?: string;
  /** Required for 'recently-viewed' — the visitor's own viewed-product history; sourced from CDP events (events/pipeline.ts) once that history exists, never fabricated. */
  deviceId?: string;
  limit: number;
}

export interface RecommendationEngineContract {
  readonly id: string;
  /** Which slots this engine actually implements — an engine may cover only a subset (e.g. a "trending" specialist), per the same "an engine may omit an entry" fallback discipline `THEME_ENGINE_ARCHITECTURE.md` §2.3 already uses for theme components. */
  readonly supportedSlots: RecommendationSlot[];
  recommend(request: RecommendationRequest): Promise<ProductSummary[]>;
}
