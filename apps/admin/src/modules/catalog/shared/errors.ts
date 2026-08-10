import { ConflictError, ForbiddenError, ApiError } from '@nexgen/api-client';

/**
 * Slice 2 addition — the Product Editor's own sub-cards (Media, Variants,
 * Organization, Activity) each fire several independent mutations outside
 * any single React Hook Form (`ProductFormPage`'s own top-level
 * `applyServerValidationErrors`/`ConflictError` handling only covers its
 * own General-tab form submit). One shared mapper here, rather than each
 * card re-deriving its own copy of "what does a 409 mean to an operator".
 */
export function catalogErrorMessage(error: unknown): string {
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
