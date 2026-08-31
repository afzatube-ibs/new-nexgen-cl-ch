/**
 * `apps/backend/.../Reviews/routes.php` — Production Completion Plan v2,
 * Milestone 11 (Reviews Foundation, backend/Gateway/Storefront) built the
 * real backend this file types; Milestone 13 (this one) is the first
 * Admin consumer. Field-for-field matched to the real backend's own
 * `Http\Resources\ReviewResource` (confirmed by direct code read).
 */

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ReviewMerchantResponse {
  body: string;
  respondedAt: string | null;
}

export interface ReviewDTO {
  id: string;
  productId: string;
  customerId: string;
  authorName: string;
  orderId: string | null;
  rating: number;
  title: string | null;
  body: string;
  verifiedPurchase: boolean;
  status: ReviewStatus;
  rejectionReason: string | null;
  merchantResponse: ReviewMerchantResponse | null;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** `ReviewController::index` — `product_id`/`status`/`page`/`per_page`, confirmed by reading it directly. */
export interface ListReviewsQuery {
  productId?: string;
  status?: ReviewStatus;
  customerId?: string;
  page?: number;
  perPage?: number;
}

/** `ReviewSummaryController::show` — `GET /reviews/summary?product_id=`, `reviews.reviews.view`. Always `status=approved`-scoped server-side. */
export interface ReviewSummaryDTO {
  averageRating: number | null;
  totalCount: number;
  distribution: Array<{ stars: number; count: number }>;
}

/**
 * Shared by `approve`/`destroy` — each takes only `expected_version`
 * (`ExpectedVersionRequest`). Domain-prefixed (not the bare
 * `ExpectedVersionInput`) for the identical barrel-collision reason
 * `ReturnExpectedVersionInput`'s own docblock explains.
 */
export interface ReviewExpectedVersionInput {
  expectedVersion: number;
}

/** `RejectReviewRequest` — `reason` required. */
export interface RejectReviewInput {
  reason: string;
  expectedVersion: number;
}

/** `RespondToReviewRequest` — `body` required; calling this again replaces the prior response rather than stacking a thread. */
export interface RespondToReviewInput {
  body: string;
  expectedVersion: number;
}

export const REVIEW_TARGET_TYPE = 'App\\Domains\\Commerce\\Reviews\\Models\\Review';

export interface ReviewsAuditLogDTO {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  correlationId: string | null;
  createdAt: string;
}

/** `AuditLogController::index` (Reviews' own) — mirrors every other module's own audit-log query shape exactly: `actor_id`/`target_type`/`per_page` only, no `target_id` filter. */
export interface ListReviewsAuditLogsQuery {
  targetType?: string;
  actorId?: string;
  page?: number;
  perPage?: number;
}
