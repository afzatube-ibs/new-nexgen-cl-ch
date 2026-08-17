/**
 * `AuditLog.action` is a raw event-name string — every value below confirmed
 * by reading the relevant Action in `apps/backend/app/Domains/Commerce/
 * Promotions/Actions/*.php` directly. The fallback formatter (identical to
 * every other module's own `humanizeAuditAction`) handles any action this
 * list doesn't yet name.
 */
const KNOWN_ACTIONS: Record<string, string> = {
  'promotion.created': 'Promotion created',
  'promotion.updated': 'Promotion updated',
  'promotion.archived': 'Promotion archived',
  'promotion.deleted': 'Promotion deleted',
  'promotion.condition_added': 'Condition added',
  'promotion.condition_updated': 'Condition updated',
  'promotion.condition_deleted': 'Condition removed',
  'promotion.redeemed': 'Promotion redeemed',
  'coupon.created': 'Coupon created',
  'coupon.updated': 'Coupon updated',
  'coupon.archived': 'Coupon archived',
  'coupon.deleted': 'Coupon deleted',
};

export function humanizeAuditAction(action: string): string {
  const known = KNOWN_ACTIONS[action];
  if (known) return known;
  const words = action.replace(/[._]/g, ' ').trim().split(/\s+/);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** The short class name from a fully-qualified `target_type` string (`App\...\Promotion` → `Promotion`) — display only. */
export function shortTargetType(targetType: string | null): string {
  if (!targetType) return '—';
  const parts = targetType.split('\\');
  return parts[parts.length - 1] ?? targetType;
}
