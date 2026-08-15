/**
 * `AuditLog.action` is a raw event-name string (`customer.registered`,
 * `customer.address_added`, ...) — every value this module's own
 * `AuditLogger` calls ever pass, confirmed by reading every Action in
 * `apps/backend/app/Domains/Commerce/Customers/Actions/*.php` directly.
 * Turns one into merchant-facing copy without inventing new categories —
 * the fallback formatter (`.`/`_` → spaces, capitalized) handles any
 * action this list doesn't yet name, so a future backend addition never
 * renders as a raw, un-humanized string.
 */
const KNOWN_ACTIONS: Record<string, string> = {
  'customer.registered': 'Customer registered',
  'customer.profile_updated': 'Profile updated',
  'customer.archived': 'Customer archived',
  'customer.deleted': 'Customer deleted',
  'customer.address_added': 'Address added',
  'customer.address_updated': 'Address updated',
  'customer.address_deleted': 'Address deleted',
  'customer.viewed': 'Customer viewed',
  'customer.listed': 'Customer list viewed',
  'customer.exported': 'Customer exported',
};

export function humanizeAuditAction(action: string): string {
  const known = KNOWN_ACTIONS[action];
  if (known) return known;
  const words = action.replace(/[._]/g, ' ').trim().split(/\s+/);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** The short class name from a fully-qualified `target_type` string (`App\...\Customer` → `Customer`) — display only. */
export function shortTargetType(targetType: string | null): string {
  if (!targetType) return '—';
  const parts = targetType.split('\\');
  return parts[parts.length - 1] ?? targetType;
}
