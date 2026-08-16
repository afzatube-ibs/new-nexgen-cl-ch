import { ConflictError, ForbiddenError, ApiError } from '@nexgen/api-client';

/**
 * Shipping's own error mapper — mirrors Catalog's/Inventory's/Pricing's own
 * copies, duplicated per this codebase's established convention. Every
 * exception shape here is read directly from
 * `apps/backend/app/Domains/Operations/Shipping/Exceptions/*.php` and the
 * Actions that throw them.
 */
export function shippingErrorMessage(error: unknown): string {
  if (error instanceof ConflictError) {
    // `DeleteShippingZoneAction`/`DeleteShippingMethodAction`'s own reason
    // strings — a real delete block, matched before the generic fallback so
    // the wording says "deleted," not "changed."
    const dependentRatesMatch = /one or more shipping rates still reference this (zone|method)/.exec(error.message);
    if (dependentRatesMatch) {
      return `This shipping ${dependentRatesMatch[1]} can't be deleted — one or more shipping rates still reference it. Delete or reassign those rates first.`;
    }

    // The general `DependentRecordsExistException` shape, for any other reason.
    const dependentRecordsMatch = /cannot be deleted: (.+)$/.exec(error.message);
    if (dependentRecordsMatch) {
      return `This can't be changed: ${dependentRecordsMatch[1]}`;
    }

    // `ConcurrencyConflictException` (optimistic lock) — the fallback, same wording as every other module's own error mapper.
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
