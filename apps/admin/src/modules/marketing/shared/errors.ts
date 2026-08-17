import { ConflictError, ForbiddenError, ApiError } from '@nexgen/api-client';

/**
 * Marketing's own error mapper — mirrors every other module's own
 * `*ErrorMessage` helper, duplicated rather than imported per this
 * codebase's established per-module precedent. A 409 is always
 * `ConcurrencyConflictException` (a stale `expected_version`, real for
 * Promotions/Coupons and — since Conditions thread their parent's own
 * version — for Condition writes too).
 */
export function marketingErrorMessage(error: unknown): string {
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
