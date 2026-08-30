import 'server-only';
import { gatewayFetch, gatewayFetchList, GATEWAY_BASE_URL, type GatewayFetchOptions } from './client.js';
import { GatewayRequestError } from './errors.js';
import type { GatewayErrorBody, PaginationMeta } from './types.js';
import type { Review } from '../components/ReviewCard.js';
import type { RatingDistributionBucket } from '../components/RatingSummary.js';

/**
 * Production Completion Plan v2, Milestone 11 (Reviews Foundation) — typed
 * wrappers over the Gateway's own real `/v1/reviews*` routes
 * (`apps/store-api-gateway/src/routes/reviews.ts`), mirroring
 * `gateway/catalog.ts`'s own established pattern for the two public reads
 * and `gateway/customerAuth.ts`'s own pattern for the one customer-
 * authenticated write.
 *
 * `Review`/`RatingDistributionBucket` are imported from their owning Store
 * Components (`ReviewCard.tsx`/`RatingSummary.tsx`, already re-exported
 * from this package's own root barrel) rather than redeclared here —
 * those components' own props ARE this Gateway route's real contract (see
 * `composition/reviews.ts`'s own docblock on the Gateway side), so reusing
 * the type keeps both sides mechanically in sync instead of two
 * hand-maintained copies drifting apart.
 */

export interface ReviewSummary {
  averageRating: number | null;
  totalCount: number;
  distribution: RatingDistributionBucket[];
}

export function getReviews(productId: string, options: GatewayFetchOptions & { page?: number; perPage?: number } = {}): Promise<{ data: Review[]; pagination?: PaginationMeta }> {
  const { page, perPage, ...rest } = options;
  return gatewayFetchList<Review>('/v1/reviews', {
    revalidateSeconds: 60,
    tags: ['reviews', `reviews:product:${productId}`],
    ...rest,
    query: { product_id: productId, page, per_page: perPage },
  });
}

export function getReviewSummary(productId: string, options: GatewayFetchOptions = {}): Promise<ReviewSummary> {
  return gatewayFetch<ReviewSummary>('/v1/reviews/summary', {
    revalidateSeconds: 60,
    tags: ['reviews', `reviews:product:${productId}`],
    ...options,
    query: { product_id: productId },
  });
}

export interface SubmitReviewInput {
  productId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title?: string | null;
  body: string;
}

const REQUEST_TIMEOUT_MS = 8000;

/**
 * The real, live customer's own Sanctum bearer token is the caller's
 * responsibility to supply (read server-side from the httpOnly session
 * cookie — see `customerAuth.ts`'s own docblock for why this stays
 * framework-call-site-agnostic rather than reading `next/headers` here) —
 * never persisted or read from anywhere in this module.
 */
export async function submitReview(token: string, input: SubmitReviewInput): Promise<Review> {
  const url = new URL('v1/reviews', `${GATEWAY_BASE_URL}/`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ product_id: input.productId, rating: input.rating, title: input.title, body: input.body }),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => undefined)) as GatewayErrorBody | undefined;
      throw new GatewayRequestError(response.status, body);
    }

    const envelope = (await response.json()) as { data: Review };
    return envelope.data;
  } finally {
    clearTimeout(timeout);
  }
}
