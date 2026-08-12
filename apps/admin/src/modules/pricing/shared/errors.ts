import { ConflictError, ForbiddenError, ApiError } from '@nexgen/api-client';

/**
 * Pricing's own error mapper — mirrors Catalog's `catalogErrorMessage` and
 * Inventory's `inventoryErrorMessage`, duplicated rather than imported
 * since the *reasons* a 409 fires are entirely different here, even though
 * the HTTP shape is identical. Every exception shape here is read directly
 * from `apps/backend/app/Domains/Commerce/Pricing/Exceptions/*.php` and the
 * Actions that throw them — nothing here is speculative.
 */
export function pricingErrorMessage(error: unknown): string {
  if (error instanceof ConflictError) {
    // `UpdatePriceListAction`'s specific reason, reusing the generic
    // `DependentRecordsExistException` shape ("{type} [{id}] cannot be
    // deleted: {reason}") for a currency-change block, not an actual
    // deletion — matched first, and worded for what actually happened
    // rather than the exception's own literal "cannot be deleted" text.
    if (/currency cannot be changed while it has priced entries/.test(error.message)) {
      return "Currency can't be changed — this list already has priced entries. Remove them first, or create a new list in the new currency instead.";
    }

    // The general `DependentRecordsExistException` shape, for any other reason.
    const dependentRecordsMatch = /cannot be deleted: (.+)$/.exec(error.message);
    if (dependentRecordsMatch) {
      return `This can't be changed: ${dependentRecordsMatch[1]}`;
    }

    // `ConcurrencyConflictException` (optimistic lock) — the fallback, same wording as Catalog's/Inventory's.
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
