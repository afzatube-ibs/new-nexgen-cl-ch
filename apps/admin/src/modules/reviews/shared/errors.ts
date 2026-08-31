import { ConflictError, ForbiddenError, ApiError } from '@nexgen/api-client';

/**
 * Reviews' own error mapper — mirrors Returns'/Shipping's/Fulfillment's own
 * copies, duplicated per this codebase's established convention (each
 * module owns its own copy of this trivial, non-business-logic UI
 * mapping). `InvalidReviewStatusTransitionException` maps to 422 on the
 * real backend (`bootstrap/app.php`, confirmed directly) — a well-formed
 * `ApiError`, not a `ConflictError` — so `ConflictError`'s only real cause
 * in this module is a stale `expected_version` (optimistic lock).
 */
export function reviewsErrorMessage(error: unknown): string {
  if (error instanceof ConflictError) {
    return 'This was changed elsewhere since it loaded — reload the page to see the latest version before trying again.';
  }
  if (error instanceof ForbiddenError) {
    return "You don't have permission to perform this action.";
  }
  if (error instanceof ApiError) {
    return error.message || 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
