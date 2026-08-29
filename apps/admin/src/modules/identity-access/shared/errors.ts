import { ConflictError, ForbiddenError, ApiError } from '@nexgen/api-client';

/**
 * Identity & Access's own error mapper — duplicated rather than imported,
 * matching every prior module's own "each module owns its own copy of
 * this shared-shaped infrastructure" precedent (`customers/shared/
 * errors.ts`'s own docblock states the identical rule).
 */
export function identityAccessErrorMessage(error: unknown): string {
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
