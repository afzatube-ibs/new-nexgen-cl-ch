/**
 * `AuditLog.action` is a raw event-name string — every value below confirmed
 * by reading each real Action in `apps/backend/app/Domains/Commerce/
 * Reviews/Actions/*.php` directly (each one's own `auditLogger->log(action:
 * '...')` call). The fallback formatter (identical to every other module's
 * own `humanizeAuditAction`) handles any action this list doesn't yet name.
 * A separate copy from every other module's own, per this codebase's
 * established "each module owns its own trivial UI helper" convention.
 */
const KNOWN_ACTIONS: Record<string, string> = {
  'review.submitted': 'Review submitted',
  'review.approved': 'Approved',
  'review.rejected': 'Rejected',
  'review.responded': 'Merchant response added',
  'review.deleted': 'Deleted',
};

export function humanizeAuditAction(action: string): string {
  const known = KNOWN_ACTIONS[action];
  if (known) return known;
  const words = action.replace(/[._]/g, ' ').trim().split(/\s+/);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** The short class name from a fully-qualified `target_type` string (`App\...\Review` → `Review`) — display only. */
export function shortTargetType(targetType: string | null): string {
  if (!targetType) return '—';
  const parts = targetType.split('\\');
  return parts[parts.length - 1] ?? targetType;
}
