/**
 * `AuditLog.action` is a raw event-name string (`order.placed`,
 * `order.confirmed`, ...) — every value confirmed by reading every Action
 * in `apps/backend/app/Domains/Commerce/Orders/Actions/*.php` directly. The
 * fallback formatter handles any action this list doesn't yet name.
 */
const KNOWN_ACTIONS: Record<string, string> = {
  'order.placed': 'Order placed',
  'order.confirmed': 'Order confirmed',
  'order.processing_started': 'Processing started',
  'order.shipped': 'Order shipped',
  'order.delivered': 'Order delivered',
  'order.cancelled': 'Order cancelled',
  'order.note_added': 'Note added',
};

export function humanizeAuditAction(action: string): string {
  const known = KNOWN_ACTIONS[action];
  if (known) return known;
  const words = action.replace(/[._]/g, ' ').trim().split(/\s+/);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** The short class name from a fully-qualified `target_type` string (`App\...\Order` → `Order`) — display only. */
export function shortTargetType(targetType: string | null): string {
  if (!targetType) return '—';
  const parts = targetType.split('\\');
  return parts[parts.length - 1] ?? targetType;
}
