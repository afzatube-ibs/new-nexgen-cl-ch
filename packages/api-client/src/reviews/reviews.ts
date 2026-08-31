import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';
import type { ReviewDTO, ListReviewsQuery, ReviewSummaryDTO, ReviewExpectedVersionInput } from './types.js';

/** `apps/backend/.../Reviews/routes.php` — `reviews`, `reviews.reviews.view`/`.manage`. */
const BASE_PATH = '/reviews';

export function listReviews(client: ApiClient, query?: ListReviewsQuery): Promise<ListEnvelope<ReviewDTO>> {
  return client.get<ListEnvelope<ReviewDTO>>(BASE_PATH, {
    query: query && { product_id: query.productId, status: query.status, customer_id: query.customerId, page: query.page, per_page: query.perPage },
  });
}

export function getReview(client: ApiClient, id: string): Promise<ReviewDTO> {
  return client.get<DataEnvelope<ReviewDTO>>(`${BASE_PATH}/${id}`).then((r) => r.data);
}

/** `GET /reviews/summary?product_id=` — `reviews.reviews.view`. Always `status=approved`-scoped server-side. */
export function getReviewSummary(client: ApiClient, productId: string): Promise<ReviewSummaryDTO> {
  return client.get<DataEnvelope<ReviewSummaryDTO>>(`${BASE_PATH}/summary`, { query: { product_id: productId } }).then((r) => r.data);
}

/** `ReviewController::destroy` — `reviews.reviews.manage`. Soft-delete, staff-only, for abuse/spam. */
export function deleteReview(client: ApiClient, id: string, input: ReviewExpectedVersionInput): Promise<void> {
  return client.delete<void>(`${BASE_PATH}/${id}`, { expected_version: input.expectedVersion });
}
