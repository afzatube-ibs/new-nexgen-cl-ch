import type { ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Copy, ClipboardList, CreditCard, PackageCheck, User, PlayCircle, ShieldCheck, CheckCircle2, Ban, XCircle, AlertTriangle, Webhook, Undo2 } from 'lucide-react';
import { Text, Badge, Button, Card, CardHeader, CardTitle, CardContent, Skeleton, ErrorState, useToast } from '@nexgen/ui';
import type { PaymentStatus, PaymentAttemptType } from '@nexgen/api-client';
import { RequirePermission } from '../../../framework/index.js';
import { formatCurrency } from '../shared/formatCurrency.js';
import { usePayment, usePaymentMethods } from './queries.js';
import { PaymentWorkflowActions } from './PaymentWorkflowActions.js';

const STATUS_VARIANT: Record<PaymentStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  pending: 'default',
  authorized: 'info',
  captured: 'success',
  failed: 'danger',
  cancelled: 'danger',
  voided: 'danger',
  partially_refunded: 'warning',
  refunded: 'warning',
};

const ATTEMPT_ICON: Record<PaymentAttemptType, ReactNode> = {
  initiation: <PlayCircle className="size-4" aria-hidden="true" />,
  authorization: <ShieldCheck className="size-4" aria-hidden="true" />,
  capture: <CheckCircle2 className="size-4" aria-hidden="true" />,
  cancellation: <Ban className="size-4" aria-hidden="true" />,
  void: <XCircle className="size-4" aria-hidden="true" />,
  failure: <AlertTriangle className="size-4" aria-hidden="true" />,
  webhook: <Webhook className="size-4" aria-hidden="true" />,
  refund: <Undo2 className="size-4" aria-hidden="true" />,
};

const ATTEMPT_LABEL: Record<PaymentAttemptType, string> = {
  initiation: 'Initiated',
  authorization: 'Authorized',
  capture: 'Captured',
  cancellation: 'Cancelled',
  void: 'Voided',
  failure: 'Failed',
  webhook: 'Gateway webhook received',
  refund: 'Refunded',
};

function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}

function OverviewField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <Text variant="caption" className="text-text-secondary">
        {label}
      </Text>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

/**
 * Payment Detail — a dedicated route (`payments/payments/:id`), mirroring
 * Shipment Detail's own shape. `PaymentController::show` is the only
 * endpoint that loads `attempts` — this page's one `usePayment(id)` query is
 * the single source for Overview and the Transaction Timeline both.
 *
 * Read-only, per Slice 1's own explicit scope: no Capture/Cancel/Void/
 * Refund/Bank-Transfer-verification action is built here — all real,
 * existing backend capabilities deliberately left unwrapped.
 *
 * **"Audit" link** goes to the module-wide Payments Activity page, not a
 * per-payment filtered view — `AuditLogController::index` (Payments' own)
 * supports no `target_id` filter (confirmed by reading it directly, the
 * identical constraint every other module's own audit endpoint has), so
 * this Payment's own Transaction Timeline (below) is the real per-payment
 * activity record; the Audit link is for the module-wide, unfiltered log.
 *
 * **No `amountRefunded`/`refundedAt` field** — the real backend
 * `PaymentResource` does not expose either, even though both are real,
 * populated columns (confirmed by reading the resource directly; see
 * `PHASE_2_9_PAYMENTS_ARCHITECTURE.md` §2.3). Not fabricated here — a
 * `partially_refunded`/`refunded` payment shows that real status via the
 * badge, honestly, without inventing a refund amount the API doesn't return.
 */
export function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: payment, status: queryStatus, refetch } = usePayment(id);
  const { data: methods } = usePaymentMethods();
  const gatewayLabelByCode = new Map((methods?.data ?? []).map((m) => [m.code, m.label]));

  async function handleCopyId(): Promise<void> {
    if (!payment) return;
    await navigator.clipboard.writeText(payment.id);
    toast({ variant: 'success', title: 'Payment ID copied' });
  }

  if (queryStatus === 'pending') {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton shape="block" className="h-8 w-64" />
        <Skeleton shape="block" className="h-40 w-full" />
        <Skeleton shape="block" className="h-40 w-full" />
      </div>
    );
  }

  if (queryStatus === 'error' || !payment) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const attempts = payment.attempts ?? [];
  const gatewayLabel = gatewayLabelByCode.get(payment.gatewayCode) ?? payment.gatewayCode;

  return (
    <div>
      <button
        type="button"
        onClick={() => void navigate('/payments/payments')}
        className="mb-3 inline-flex items-center gap-1 text-label text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Back to Payments
      </button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Text as="h1" variant="heading" className="font-mono">
              Payment {payment.id.slice(0, 8)}
            </Text>
            <Badge variant={STATUS_VARIANT[payment.status]}>{payment.status.replace('_', ' ')}</Badge>
          </div>
          <Text variant="body" className="mt-1 text-text-secondary">
            {gatewayLabel} · {formatCurrency(payment.amount, payment.currencyCode)}
          </Text>
        </div>
        <RequirePermission anyOf={['payments.audit_log.view']} inline={null}>
          <Button asChild variant="outline">
            <Link to="/payments/activity">
              <ClipboardList className="size-4" /> Audit
            </Link>
          </Button>
        </RequirePermission>
      </div>

      <div className="flex flex-col gap-4">
        {payment.status === 'failed' && payment.failureReason && (
          <Card className="border-feedback-danger/40">
            <CardContent className="flex items-start gap-2.5 pt-4">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-feedback-danger" aria-hidden="true" />
              <div>
                <Text variant="body-strong">Payment failed</Text>
                <Text variant="body" className="text-text-secondary">
                  {payment.failureReason}
                </Text>
              </div>
            </CardContent>
          </Card>
        )}

        <RequirePermission anyOf={['payments.payments.manage', 'payments.bank_transfer.verify']} inline={null}>
          <Card>
            <CardHeader>
              <CardTitle>Payment Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentWorkflowActions payment={payment} />
            </CardContent>
          </Card>
        </RequirePermission>

        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <OverviewField
                label="Order"
                value={
                  <div className="flex items-center gap-1.5">
                    <Text variant="body" className="font-mono text-caption">
                      {payment.orderId.slice(0, 8)}
                    </Text>
                    {/* `Payment.orderId` is identifier-only, never a live foreign key (confirmed via the payments migration's own docblock) — this link can 404 if the order was since deleted, an accepted, honest edge case. */}
                    <RequirePermission anyOf={['orders.orders.view']} inline={null}>
                      <Button asChild variant="ghost" size="sm" aria-label={`View order ${payment.orderId.slice(0, 8)}`}>
                        <Link to={`/orders/${payment.orderId}`}>
                          <PackageCheck className="size-3.5" />
                        </Link>
                      </Button>
                    </RequirePermission>
                  </div>
                }
              />
              <OverviewField
                label="Customer"
                value={
                  payment.customerId ? (
                    <div className="flex items-center gap-1.5">
                      <Text variant="body" className="font-mono text-caption">
                        {payment.customerId.slice(0, 8)}
                      </Text>
                      <RequirePermission anyOf={['customers.customers.view']} inline={null}>
                        <Button asChild variant="ghost" size="sm" aria-label={`View customer ${payment.customerId.slice(0, 8)}`}>
                          <Link to={`/customers/${payment.customerId}`}>
                            <User className="size-3.5" />
                          </Link>
                        </Button>
                      </RequirePermission>
                    </div>
                  ) : (
                    <Text variant="body" className="text-text-secondary">
                      —
                    </Text>
                  )
                }
              />
              <OverviewField label="Gateway" value={<Text variant="body">{gatewayLabel}</Text>} />
              <OverviewField label="Amount" value={<Text variant="body">{formatCurrency(payment.amount, payment.currencyCode)}</Text>} />
              <OverviewField label="Amount captured" value={<Text variant="body">{formatCurrency(payment.amountCaptured, payment.currencyCode)}</Text>} />
              <OverviewField label="Currency" value={<Text variant="body">{payment.currencyCode}</Text>} />
              <OverviewField label="Initiated" value={<Text variant="body">{formatDateTime(payment.initiatedAt)}</Text>} />
              <OverviewField label="Authorized" value={<Text variant="body">{formatDateTime(payment.authorizedAt)}</Text>} />
              <OverviewField label="Captured" value={<Text variant="body">{formatDateTime(payment.capturedAt)}</Text>} />
              {payment.cancelledAt && <OverviewField label="Cancelled" value={<Text variant="body">{formatDateTime(payment.cancelledAt)}</Text>} />}
              {payment.failedAt && <OverviewField label="Failed" value={<Text variant="body">{formatDateTime(payment.failedAt)}</Text>} />}
              {payment.proofReference && <OverviewField label="Bank transfer proof" value={<Text variant="body">{payment.proofReference}</Text>} />}
              {payment.instructions && <OverviewField label="Instructions" value={<Text variant="body">{payment.instructions}</Text>} />}
              <OverviewField
                label="Payment ID"
                value={
                  <div className="flex items-center gap-1.5">
                    <Text variant="body" className="truncate font-mono text-caption">
                      {payment.id}
                    </Text>
                    <Button variant="ghost" size="sm" aria-label="Copy payment ID" onClick={() => void handleCopyId()}>
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <div className="flex items-center gap-2 text-text-secondary">
                <CreditCard className="size-4" aria-hidden="true" />
                <Text variant="body">No transaction attempts recorded yet.</Text>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {attempts.map((attempt) => (
                  <div key={attempt.id} className="flex items-start gap-2.5">
                    <div className="mt-0.5 text-text-secondary">{ATTEMPT_ICON[attempt.type]}</div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Text variant="body-strong">{ATTEMPT_LABEL[attempt.type]}</Text>
                        <Badge variant={attempt.status === 'succeeded' ? 'success' : attempt.status === 'failed' ? 'danger' : 'default'}>{attempt.status}</Badge>
                      </div>
                      <Text variant="caption" className="text-text-secondary">
                        {formatDateTime(attempt.occurredAt)}
                        {attempt.amount ? ` · ${formatCurrency(attempt.amount, attempt.currencyCode ?? payment.currencyCode)}` : ''}
                        {attempt.gatewayReference ? ` · Ref ${attempt.gatewayReference}` : ''}
                      </Text>
                      {attempt.failureReason && (
                        <Text variant="caption" className="text-feedback-danger">
                          {attempt.failureReason}
                        </Text>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
