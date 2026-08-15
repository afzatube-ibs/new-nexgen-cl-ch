import { ConflictError, ForbiddenError, ApiError } from '@nexgen/api-client';

/**
 * Customers' own error mapper — mirrors Catalog's `catalogErrorMessage`,
 * Inventory's `inventoryErrorMessage`, and Pricing's `pricingErrorMessage`,
 * duplicated rather than imported (each module owns its own copy of this
 * shared-shaped infrastructure, matching every prior module's own
 * precedent). Every exception shape here is read directly from
 * `apps/backend/app/Domains/Commerce/Customers/Actions/*.php` — nothing
 * here is speculative.
 *
 * Unlike Pricing's Tax entities, `DeleteCustomerAction` has no dependent-
 * record check to surface a friendly message for — `customer_id` is
 * referenced by Checkout/Orders as an identifier only, never a real
 * foreign key (see `PHASE_2_5_CUSTOMERS_ARCHITECTURE.md` §2/§3), so a 409
 * from this module is always the plain optimistic-lock conflict, never a
 * "can't delete, X still references it" block.
 */
export function customersErrorMessage(error: unknown): string {
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
