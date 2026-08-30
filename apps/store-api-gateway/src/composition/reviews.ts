/**
 * Production Completion Plan v2, Milestone 11 (Reviews Foundation).
 * Composes the real backend's own new Reviews module (`GET reviews`,
 * `GET reviews/summary`, `POST reviews`) into the Storefront Component
 * Engine's already-built, currently-unwired `ReviewCard`/`RatingSummary`
 * contracts (`packages/storefront-engine/src/components/{ReviewCard,
 * RatingSummary}.tsx`) — a dedicated composition file, mirroring
 * `composition/pricing.ts`'s own established per-domain-module pattern
 * rather than growing `composition/mappers.ts` (that file's own docblock
 * scopes it to Catalog/Search specifically).
 *
 * `BackendReview` is field-for-field the real backend's own
 * `Reviews\Http\Resources\ReviewResource` (confirmed by direct code
 * read). `toPublicReview` deliberately drops `customerId`, `status`, and
 * `rejectionReason` — this Gateway's own public `GET /reviews` route only
 * ever forwards `status=approved` server-side (never caller-controlled),
 * so every review reaching this mapper is already public; `customerId`
 * is never a shopper-facing field (no other customer's real identifier
 * belongs in a public API response), and `status`/`rejectionReason` are
 * internal moderation state a public reader has no legitimate reason to
 * see.
 */
import type { BackendPaginationMeta } from '../backend/types.js';

export interface BackendReview {
  id: string;
  productId: string;
  customerId: string;
  authorName: string;
  orderId: string | null;
  rating: number;
  title: string | null;
  body: string;
  verifiedPurchase: boolean;
  status: string;
  rejectionReason: string | null;
  merchantResponse: { body: string; respondedAt: string | null } | null;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BackendReviewSummary {
  averageRating: number | null;
  totalCount: number;
  distribution: { stars: number; count: number }[];
}

/**
 * Matches `packages/storefront-engine/src/components/ReviewCard.tsx`'s own
 * `Review` interface exactly. `photos` is always omitted — no photo-review
 * upload path exists anywhere in this platform (an honest gap, not a
 * silently-dropped real field).
 */
export interface PublicReview {
  id: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title?: string;
  body: string;
  createdAt: string;
  verifiedPurchase: boolean;
  merchantResponse?: { body: string; respondedAt: string };
}

export function toPublicReview(review: BackendReview): PublicReview {
  return {
    id: review.id,
    authorName: review.authorName,
    rating: review.rating as 1 | 2 | 3 | 4 | 5,
    title: review.title ?? undefined,
    body: review.body,
    createdAt: review.createdAt ?? '',
    verifiedPurchase: review.verifiedPurchase,
    merchantResponse: review.merchantResponse
      ? { body: review.merchantResponse.body, respondedAt: review.merchantResponse.respondedAt ?? '' }
      : undefined,
  };
}

/** Matches `RatingSummary.tsx`'s own props exactly — a direct pass-through, nothing computed here. */
export interface PublicReviewSummary {
  averageRating: number | null;
  totalCount: number;
  distribution: { stars: number; count: number }[];
}

export function toPublicReviewSummary(summary: BackendReviewSummary): PublicReviewSummary {
  return {
    averageRating: summary.averageRating,
    totalCount: summary.totalCount,
    distribution: summary.distribution,
  };
}

/** The identical raw-Laravel-paginator-meta reshape every list route in this Gateway already performs (see routes/catalog.ts). */
export function toPaginationMeta(meta: BackendPaginationMeta | undefined, dataLength: number) {
  if (!meta) return undefined;
  return {
    currentPage: meta.current_page ?? meta.currentPage ?? 1,
    lastPage: meta.last_page ?? meta.lastPage ?? 1,
    perPage: meta.per_page ?? meta.perPage ?? dataLength,
    total: meta.total ?? dataLength,
  };
}
