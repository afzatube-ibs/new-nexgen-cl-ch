/**
 * `AuditLog.action` is a raw event-name string — every value below confirmed
 * by reading the relevant Action in `apps/backend/app/Domains/Commerce/
 * Payments/Actions/*.php` directly. `payment.bank_transfer_proof_attached`
 * is the only Bank Transfer-specific action string — the approve/reject
 * steps reuse `CapturePaymentAction`/`MarkPaymentFailedAction` internally
 * (confirmed via `BankTransferVerificationController`), so they log as
 * `payment.captured`/`payment.failed`, not a separate action name. The
 * fallback formatter (identical to every other module's own
 * `humanizeAuditAction`) handles any action this list doesn't yet name.
 */
const KNOWN_ACTIONS: Record<string, string> = {
  'payment.initiated': 'Payment initiated',
  'payment.authorized': 'Payment authorized',
  'payment.captured': 'Payment captured',
  'payment.cancelled': 'Payment cancelled',
  'payment.voided': 'Payment voided',
  'payment.failed': 'Payment failed',
  'payment.refunded': 'Payment refunded',
  'payment.bank_transfer_proof_attached': 'Bank transfer proof attached',
  'payment.webhook_rejected': 'Webhook rejected',
  'payment.webhook_unmatched': 'Webhook unmatched',
};

export function humanizeAuditAction(action: string): string {
  const known = KNOWN_ACTIONS[action];
  if (known) return known;
  const words = action.replace(/[._]/g, ' ').trim().split(/\s+/);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** The short class name from a fully-qualified `target_type` string (`App\...\Payment` → `Payment`) — display only. */
export function shortTargetType(targetType: string | null): string {
  if (!targetType) return '—';
  const parts = targetType.split('\\');
  return parts[parts.length - 1] ?? targetType;
}
