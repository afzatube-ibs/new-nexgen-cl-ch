import { useState } from 'react';
import { RefreshCw, PackageOpen, Truck, CheckCircle2, Ban } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Text, Badge, Button } from '@nexgen/ui';
import type { ReturnRequestDTO, RefundRequestStatus, ExchangeRequestStatus } from '@nexgen/api-client';
import { ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { returnsErrorMessage } from '../shared/errors.js';
import { useRetryRefundRequest, useStartPreparingExchange, useCompleteExchange, useCancelExchange } from '../shared/queries.js';
import { ReturnMarkExchangeShippedDialog } from './ReturnMarkExchangeShippedDialog.js';

function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}

const REFUND_STATUS_VARIANT: Record<RefundRequestStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  pending: 'default',
  processing: 'warning',
  completed: 'success',
  failed: 'danger',
};

const EXCHANGE_STATUS_VARIANT: Record<ExchangeRequestStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  pending: 'default',
  preparing: 'warning',
  shipped: 'info',
  completed: 'success',
  cancelled: 'danger',
};

export interface ReturnRefundExchangePanelProps {
  returnRequest: ReturnRequestDTO;
}

/**
 * The Refund/Exchange sub-panel — shown only once `resolve()` has created
 * one of these two real, independent aggregate roots (`RefundRequestDTO`/
 * `ExchangeRequestDTO`, embedded on the parent via `whenLoaded()`, both
 * confirmed present by `ReturnRequestController::show()`'s own eager-load
 * list). Each sub-lifecycle's real transitions are read directly from
 * `RefundRequest`/`ExchangeRequest`'s own `TRANSITIONS` const (see
 * `types.ts`'s own docblock) — a refund moves to `completed`/`failed`
 * automatically via the payment gateway's own async side effects (no
 * staff-facing "complete a refund" action exists; only `retry()` on a real
 * `failed` refund is a real endpoint), while an exchange requires this
 * page's own explicit Prepare → Ship → Complete staff actions.
 */
export function ReturnRefundExchangePanel({ returnRequest }: ReturnRefundExchangePanelProps) {
  const refund = returnRequest.refundRequest;
  const exchange = returnRequest.exchangeRequest;

  const retryMutation = useRetryRefundRequest();
  const startPreparingMutation = useStartPreparingExchange();
  const completeMutation = useCompleteExchange();
  const cancelMutation = useCancelExchange();
  const [shipOpen, setShipOpen] = useState(false);

  if (!refund && !exchange) return null;

  return (
    <>
      {refund && (
        <Card>
          <CardHeader>
            <CardTitle>Refund</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Text variant="caption" className="text-text-secondary">
                  Status
                </Text>
                <div className="mt-0.5">
                  <Badge variant={REFUND_STATUS_VARIANT[refund.status]}>{refund.status}</Badge>
                </div>
              </div>
              <div>
                <Text variant="caption" className="text-text-secondary">
                  Amount
                </Text>
                <Text variant="body" className="mt-0.5">
                  {refund.amount} {refund.currencyCode}
                </Text>
              </div>
              <div>
                <Text variant="caption" className="text-text-secondary">
                  Payment ID
                </Text>
                <Text variant="body" className="mt-0.5 font-mono text-caption">
                  {refund.paymentId}
                </Text>
              </div>
              <div>
                <Text variant="caption" className="text-text-secondary">
                  Requested
                </Text>
                <Text variant="body" className="mt-0.5">
                  {formatDateTime(refund.requestedAt)}
                </Text>
              </div>
              <div>
                <Text variant="caption" className="text-text-secondary">
                  Completed
                </Text>
                <Text variant="body" className="mt-0.5">
                  {formatDateTime(refund.completedAt)}
                </Text>
              </div>
              {refund.gatewayReference && (
                <div>
                  <Text variant="caption" className="text-text-secondary">
                    Gateway reference
                  </Text>
                  <Text variant="body" className="mt-0.5 font-mono text-caption">
                    {refund.gatewayReference}
                  </Text>
                </div>
              )}
            </div>
            {refund.status === 'failed' && (
              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                {refund.failureReason && (
                  <Text variant="body" className="text-feedback-danger">
                    {refund.failureReason}
                  </Text>
                )}
                <RequirePermission anyOf={['returns.requests.resolve']} inline={null}>
                  <Button
                    variant="outline"
                    className="w-fit"
                    loading={retryMutation.isPending}
                    onClick={() => void retryMutation.mutateAsync({ refundRequestId: refund.id, returnRequestId: returnRequest.id })}
                  >
                    <RefreshCw className="size-4" /> Retry refund
                  </Button>
                </RequirePermission>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {exchange && (
        <Card>
          <CardHeader>
            <CardTitle>Exchange</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Text variant="caption" className="text-text-secondary">
                  Status
                </Text>
                <div className="mt-0.5">
                  <Badge variant={EXCHANGE_STATUS_VARIANT[exchange.status]}>{exchange.status}</Badge>
                </div>
              </div>
              <div>
                <Text variant="caption" className="text-text-secondary">
                  Desired SKU
                </Text>
                <Text variant="body" className="mt-0.5 font-mono text-caption">
                  {exchange.desiredSku}
                </Text>
              </div>
              <div>
                <Text variant="caption" className="text-text-secondary">
                  Quantity
                </Text>
                <Text variant="body" className="mt-0.5 tabular-nums">
                  {exchange.desiredQuantity}
                </Text>
              </div>
              {exchange.desiredDescription && (
                <div>
                  <Text variant="caption" className="text-text-secondary">
                    Description
                  </Text>
                  <Text variant="body" className="mt-0.5">
                    {exchange.desiredDescription}
                  </Text>
                </div>
              )}
              <div>
                <Text variant="caption" className="text-text-secondary">
                  Tracking number
                </Text>
                <Text variant="body" className="mt-0.5 font-mono text-caption">
                  {exchange.trackingNumber ?? '—'}
                </Text>
              </div>
              <div>
                <Text variant="caption" className="text-text-secondary">
                  Completed
                </Text>
                <Text variant="body" className="mt-0.5">
                  {formatDateTime(exchange.completedAt)}
                </Text>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <RequirePermission anyOf={['returns.requests.manage']} inline={null}>
                {exchange.status === 'pending' && (
                  <ConfirmDialog
                    trigger={
                      <Button variant="outline">
                        <PackageOpen className="size-4" /> Start preparing
                      </Button>
                    }
                    title="Start preparing this exchange?"
                    description="This exchange will move to Preparing."
                    confirmLabel="Start preparing"
                    onConfirm={async () => {
                      await startPreparingMutation.mutateAsync({ exchangeRequestId: exchange.id, returnRequestId: returnRequest.id, input: { expectedVersion: exchange.version } });
                    }}
                    getErrorMessage={returnsErrorMessage}
                  />
                )}
                {exchange.status === 'preparing' && (
                  <Button variant="outline" onClick={() => setShipOpen(true)}>
                    <Truck className="size-4" /> Mark shipped
                  </Button>
                )}
                {exchange.status === 'shipped' && (
                  <ConfirmDialog
                    trigger={
                      <Button>
                        <CheckCircle2 className="size-4" /> Complete exchange
                      </Button>
                    }
                    title="Complete this exchange?"
                    description="This exchange will move to Completed, a final state."
                    confirmLabel="Complete"
                    onConfirm={async () => {
                      await completeMutation.mutateAsync({ exchangeRequestId: exchange.id, returnRequestId: returnRequest.id, input: { expectedVersion: exchange.version } });
                    }}
                    getErrorMessage={returnsErrorMessage}
                  />
                )}
              </RequirePermission>
              <RequirePermission anyOf={['returns.requests.cancel']} inline={null}>
                {(exchange.status === 'pending' || exchange.status === 'preparing') && (
                  <ConfirmDialog
                    trigger={
                      <Button variant="outline" className="text-feedback-danger hover:text-feedback-danger">
                        <Ban className="size-4" /> Cancel exchange
                      </Button>
                    }
                    title="Cancel this exchange?"
                    description="This exchange will move to Cancelled, a final state."
                    confirmLabel="Cancel exchange"
                    destructive
                    onConfirm={async () => {
                      await cancelMutation.mutateAsync({ exchangeRequestId: exchange.id, returnRequestId: returnRequest.id, input: { expectedVersion: exchange.version } });
                    }}
                    getErrorMessage={returnsErrorMessage}
                  />
                )}
              </RequirePermission>
              {exchange.status === 'completed' || exchange.status === 'cancelled' ? (
                <Text variant="body" className="text-text-secondary">
                  This exchange is in a final state — no further action is available.
                </Text>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {exchange && <ReturnMarkExchangeShippedDialog open={shipOpen} onOpenChange={setShipOpen} exchangeRequest={exchange} returnRequestId={returnRequest.id} />}
    </>
  );
}
