import { CreditCard } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Text, Badge, Skeleton, ErrorState } from '@nexgen/ui';
import type { PaymentDTO, PaymentStatus } from '@nexgen/api-client';
import { formatCurrency } from '../shared/formatCurrency.js';
import { useOrderPayments } from '../shared/queries.js';

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

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

/**
 * Payments — `payments.payments.view`, a real, server-filtered read of
 * Payments' own `GET /payments?order_id=` (`PaymentController::index`,
 * confirmed by reading it directly: genuinely supports `order_id`). A real
 * cross-domain relationship — Checkout's own submission flow initiates a
 * real Payment against this exact Order.
 *
 * A separate permission from `orders.*`. Read-only: no capture/cancel/
 * void/refund action is built here — Payment Capture and Payment Refund
 * are explicitly out of this slice's own scope, and those actions belong
 * to a distinct, not-yet-built Payments admin module.
 *
 * An order with no Payment row (e.g. the manual backend fixtures used to
 * live-verify this slice, which bypass Checkout entirely) shows an honest
 * empty state — never a fabricated "no payment method" placeholder.
 */
export function OrderPaymentsCard({ orderId }: { orderId: string }) {
  const { data, status, refetch } = useOrderPayments(orderId);
  const payments = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
      </CardHeader>
      <CardContent>
        {status === 'pending' && (
          <div className="flex flex-col gap-2">
            <Skeleton shape="block" className="h-10 w-full" />
          </div>
        )}
        {status === 'error' && <ErrorState onRetry={() => void refetch()} />}
        {status === 'success' && payments.length === 0 && (
          <div className="flex items-center gap-2 text-text-secondary">
            <CreditCard className="size-4" aria-hidden="true" />
            <Text variant="body">No payment recorded yet.</Text>
          </div>
        )}
        {status === 'success' && payments.length > 0 && (
          <div className="flex flex-col divide-y divide-border">
            {payments.map((payment: PaymentDTO) => (
              <div key={payment.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Text variant="body-strong" className="uppercase">
                      {payment.gatewayCode}
                    </Text>
                    <Badge variant={STATUS_VARIANT[payment.status]}>{payment.status.replace('_', ' ')}</Badge>
                  </div>
                  <Text variant="caption" className="text-text-secondary">
                    {payment.capturedAt ? `Captured ${formatDate(payment.capturedAt)}` : `Initiated ${formatDate(payment.initiatedAt)}`}
                  </Text>
                  {payment.status === 'failed' && payment.failureReason && (
                    <Text variant="caption" className="text-feedback-danger">
                      {payment.failureReason}
                    </Text>
                  )}
                </div>
                <Text variant="body-strong" className="tabular-nums">
                  {formatCurrency(payment.amount, payment.currencyCode)}
                </Text>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
