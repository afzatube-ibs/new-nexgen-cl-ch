/**
 * `AuditLog.action` is a raw event-name string — every value below confirmed
 * by reading each real Action in `apps/backend/app/Domains/Operations/
 * Returns/Actions/*.php` directly (each one's own `auditLogger->log(action:
 * '...')` call). The fallback formatter (identical to Shipping's/
 * Fulfillment's/Orders' own `humanizeAuditAction`) handles any action this
 * list doesn't yet name, so an unlisted-but-real action still reads
 * sensibly rather than showing a raw snake_case string. A separate copy
 * from Shipping's own, per this codebase's established "each module owns
 * its own trivial UI helper" convention (see `shared/errors.ts`'s own
 * docblock for the same reasoning).
 */
const KNOWN_ACTIONS: Record<string, string> = {
  'return_request.created': 'Return request created',
  'return_request.approved': 'Approved',
  'return_request.rejected': 'Rejected',
  'return_request.cancelled': 'Cancelled',
  'return_request.pickup_scheduled': 'Pickup scheduled',
  'return_request.received': 'Marked received',
  'return_request.inspection_started': 'Inspection started',
  'return_request.resolved': 'Resolved',
  'return_note.added': 'Note added',
  'refund_request.processing_started': 'Refund processing started',
  'refund_request.completed': 'Refund completed',
  'refund_request.failed': 'Refund failed',
  'exchange_request.preparing': 'Exchange preparing',
  'exchange_request.shipped': 'Exchange shipped',
  'exchange_request.completed': 'Exchange completed',
  'exchange_request.cancelled': 'Exchange cancelled',
};

export function humanizeAuditAction(action: string): string {
  const known = KNOWN_ACTIONS[action];
  if (known) return known;
  const words = action.replace(/[._]/g, ' ').trim().split(/\s+/);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** The short class name from a fully-qualified `target_type` string (`App\...\ReturnRequest` → `ReturnRequest`) — display only. */
export function shortTargetType(targetType: string | null): string {
  if (!targetType) return '—';
  const parts = targetType.split('\\');
  return parts[parts.length - 1] ?? targetType;
}
