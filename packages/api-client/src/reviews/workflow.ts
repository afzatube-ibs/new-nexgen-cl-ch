import type { ApiClient } from '../client.js';
import type { DataEnvelope } from '../types.js';
import type { ReviewDTO, ReviewExpectedVersionInput, RejectReviewInput, RespondToReviewInput } from './types.js';

/**
 * `apps/backend/.../Reviews/routes.php` — this module's real moderation
 * workflow, one function per real `ReviewWorkflowController` endpoint.
 * Permission-gated server-side per its own key (`reviews.reviews.{moderate,manage}`,
 * confirmed via `routes.php` directly) — never re-derived or bypassed here.
 * Moderation is genuinely bidirectional (`pending → approved|rejected`,
 * `approved ⇄ rejected`) — `approve`/`reject` are both offered regardless
 * of a review's current status; the real backend's own `InvalidReviewStatusTransitionException`
 * (422) is the actual enforcement, never re-implemented client-side.
 */
const BASE_PATH = '/reviews';

function unwrap(client: ApiClient, path: string, body: Record<string, unknown>): Promise<ReviewDTO> {
  return client.post<DataEnvelope<ReviewDTO>>(path, body).then((r) => r.data);
}

/** `POST /reviews/{id}/approve` — `reviews.reviews.moderate`. */
export function approveReview(client: ApiClient, id: string, input: ReviewExpectedVersionInput): Promise<ReviewDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/approve`, { expected_version: input.expectedVersion });
}

/** `POST /reviews/{id}/reject` — `reviews.reviews.moderate`. `reason` is `required` (`RejectReviewRequest`). */
export function rejectReview(client: ApiClient, id: string, input: RejectReviewInput): Promise<ReviewDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/reject`, { reason: input.reason, expected_version: input.expectedVersion });
}

/** `POST /reviews/{id}/respond` — `reviews.reviews.manage`. Replaces any prior merchant response rather than stacking a thread. */
export function respondToReview(client: ApiClient, id: string, input: RespondToReviewInput): Promise<ReviewDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/respond`, { body: input.body, expected_version: input.expectedVersion });
}
