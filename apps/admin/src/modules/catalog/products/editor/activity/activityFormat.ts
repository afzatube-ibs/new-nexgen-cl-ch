/**
 * `AuditLog.action` (apps/backend) is a stable machine string like
 * `product.created` or `product_variant.added` — this turns it into
 * operator-facing text ("Product created", "Product variant added")
 * without a hand-maintained lookup table per action, so a future Action
 * that logs a new string still renders sensibly without a frontend change.
 */
export function humanizeAuditAction(action: string): string {
  const words = action.replace(/\./g, ' ').replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
