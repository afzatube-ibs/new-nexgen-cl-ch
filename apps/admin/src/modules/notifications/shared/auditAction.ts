/**
 * `AuditLog.action` is a raw event-name string. The fallback formatter
 * (identical to every other module's own `humanizeAuditAction`) handles
 * any action this list doesn't yet name. A separate copy from every other
 * module's own, per this codebase's established convention.
 */
const KNOWN_ACTIONS: Record<string, string> = {
  'notification_template.created': 'Template created',
  'notification_template.updated': 'Template updated',
  'notification.queued': 'Notification queued',
  'notification.sent': 'Sent',
  'notification.failed': 'Failed',
  'notification.retry_scheduled': 'Retry scheduled',
  'notification.retry_requested': 'Retry requested',
  'notification.cancelled': 'Cancelled',
};

export function humanizeAuditAction(action: string): string {
  const known = KNOWN_ACTIONS[action];
  if (known) return known;
  const words = action.replace(/[._]/g, ' ').trim().split(/\s+/);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** The short class name from a fully-qualified `target_type` string — display only. */
export function shortTargetType(targetType: string | null): string {
  if (!targetType) return '—';
  const parts = targetType.split('\\');
  return parts[parts.length - 1] ?? targetType;
}
