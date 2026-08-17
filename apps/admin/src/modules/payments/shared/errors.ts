import { ConflictError, ForbiddenError, ApiError } from '@nexgen/api-client';

/**
 * Payments' own error mapper — mirrors Orders'/Shipping's/Customers' own
 * `*ErrorMessage` helpers, duplicated rather than imported per this
 * codebase's established per-module precedent. Every shape here is read
 * directly from `apps/backend/app/Domains/Commerce/Payments/Exceptions/*.php`
 * — a 409 is always `ConcurrencyConflictException` (a stale `expected_
 * version`), a 422 is always `InvalidPaymentStatusTransitionException` (an
 * illegal status move, e.g. voiding a payment that was never authorized) —
 * surfaced as the server's own real message rather than a generic one,
 * since it already names the exact from/to statuses.
 */
export function paymentsErrorMessage(error: unknown): string {
  if (error instanceof ConflictError) {
    return 'This payment was changed elsewhere since it loaded — reload the page to see the latest version before trying again.';
  }
  if (error instanceof ForbiddenError) {
    return "You don't have permission to perform this action.";
  }
  if (error instanceof ApiError) {
    return error.message || 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
