import { ConflictError, ForbiddenError, ApiError } from '@nexgen/api-client';

/**
 * Inventory's own error mapper — mirrors Catalog's `catalogErrorMessage`
 * (`modules/catalog/shared/errors.ts`), duplicated rather than imported
 * since the *reasons* a 409 fires are entirely different here (insufficient
 * stock, a terminal reservation/transfer state) even though the HTTP shape
 * is identical. Every one of these exceptions is real and read directly
 * from `apps/backend/app/Domains/Commerce/Inventory/Exceptions/*.php` —
 * nothing here is speculative.
 */
export function inventoryErrorMessage(error: unknown): string {
  if (error instanceof ConflictError) {
    // `InsufficientStockException`: "Stock item [id] has only {available} available, but {requested} were requested."
    // Verb-neutral wording (not "can't remove N") — this same exception fires
    // for both removing on-hand stock (Adjust Stock) and reserving it (Reserve
    // Stock), and "remove" read wrong for the latter: reserving doesn't remove
    // anything, it holds it. One honest phrasing that fits both call sites.
    const insufficientStock = /has only (\d+) available, but (\d+) were requested/.exec(error.message);
    if (insufficientStock) {
      return `Only ${insufficientStock[1]} available — ${insufficientStock[2]} requested.`;
    }

    // `DependentRecordsExistException`: "{aggregateType} [{id}] cannot be deleted: {reason}"
    const dependentRecordsMatch = /cannot be deleted: (.+)$/.exec(error.message);
    if (dependentRecordsMatch) {
      return `This can't be deleted: ${dependentRecordsMatch[1]}`;
    }

    // `InvalidReservationStateException` / `InvalidTransferStateException`: "... is already [{status}] and cannot be changed."
    const invalidStateMatch = /is already \[(\w+)\] and cannot be changed/.exec(error.message);
    if (invalidStateMatch) {
      return `This is already ${invalidStateMatch[1]} — reload the page to see its current state.`;
    }

    // `ConcurrencyConflictException` (optimistic lock) — the fallback, same wording as Catalog's.
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
