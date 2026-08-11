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
    // `DependentRecordsExistException` (apps/backend) and the optimistic-lock
    // `ConcurrencyConflictException` both map to this same `ConflictError`/409
    // (see that exception's own docblock: "Optimistic-locking conflict or a
    // restrict-on-delete guard") but need very different merchant-facing
    // text — the lock message is a raw, internal-looking string (class path
    // + version numbers) never fit to show directly, while the
    // dependent-records reason is written to be shown verbatim. Distinguished
    // by the one substring only `DependentRecordsExistException` ever
    // produces, since both come back as the same error `type`. Found via a
    // Product Owner acceptance audit of Phase 2.2 (2026-08-11), adding the
    // first delete-blocked-because-still-in-use case Catalog's taxonomy
    // entities actually throw.
    const dependentRecordsMatch = /cannot be deleted: (.+)$/.exec(error.message);
    if (dependentRecordsMatch) {
      return `This can't be deleted: ${dependentRecordsMatch[1]}`;
    }
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
