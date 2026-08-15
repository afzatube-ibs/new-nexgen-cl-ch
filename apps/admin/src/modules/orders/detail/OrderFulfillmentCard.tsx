import { Truck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Text, Badge, Skeleton, ErrorState } from '@nexgen/ui';
import type { ShipmentDTO, ShipmentStatus } from '@nexgen/api-client';
import { useOrderShipments } from '../shared/queries.js';

const STATUS_VARIANT: Record<ShipmentStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  pending: 'default',
  picking: 'warning',
  picked: 'warning',
  packing: 'warning',
  packed: 'warning',
  dispatched: 'info',
  in_transit: 'info',
  delivered: 'success',
  failed: 'danger',
  cancelled: 'danger',
};

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

/**
 * Fulfillment — `fulfillment.shipments.view`, a real, server-filtered read
 * of Fulfillment's own `GET /shipments?order_id=` (`ShipmentController::
 * index`, confirmed by reading it directly: genuinely supports `order_id`,
 * not something this slice invented). A real, existing cross-domain
 * relationship: every real Order automatically gets exactly one Shipment
 * the moment it's placed, via the platform's own already-live
 * `CreateShipmentOnOrderPlaced` listener — not a hypothetical integration.
 *
 * A separate permission from `orders.*` — the caller wrapping this
 * component in `RequirePermission` hides the whole card, not just its
 * data, for a merchant who can see Orders but not Fulfillment.
 *
 * Read-only: no shipment workflow action (pick/pack/dispatch/cancel) is
 * built here — those belong to a distinct, not-yet-built Fulfillment admin
 * module, out of this slice's own "do not redesign the Admin" scope.
 */
export function OrderFulfillmentCard({ orderId }: { orderId: string }) {
  const { data, status, refetch } = useOrderShipments(orderId);
  const shipments = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fulfillment</CardTitle>
      </CardHeader>
      <CardContent>
        {status === 'pending' && (
          <div className="flex flex-col gap-2">
            <Skeleton shape="block" className="h-10 w-full" />
          </div>
        )}
        {status === 'error' && <ErrorState onRetry={() => void refetch()} />}
        {status === 'success' && shipments.length === 0 && (
          <div className="flex items-center gap-2 text-text-secondary">
            <Truck className="size-4" aria-hidden="true" />
            <Text variant="body">No shipment yet.</Text>
          </div>
        )}
        {status === 'success' && shipments.length > 0 && (
          <div className="flex flex-col divide-y divide-border">
            {shipments.map((shipment: ShipmentDTO) => (
              <div key={shipment.id} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={STATUS_VARIANT[shipment.status]}>{shipment.status.replace('_', ' ')}</Badge>
                  {shipment.courierProviderCode && (
                    <Text variant="caption" className="text-text-secondary">
                      {shipment.courierProviderCode}
                    </Text>
                  )}
                  {shipment.trackingNumber && (
                    <Text variant="caption" className="font-mono text-text-secondary">
                      {shipment.trackingNumber}
                    </Text>
                  )}
                </div>
                <Text variant="caption" className="text-text-secondary">
                  {shipment.destination.city ? `To ${shipment.destination.city}${shipment.destination.countryCode ? `, ${shipment.destination.countryCode}` : ''} · ` : ''}
                  {shipment.deliveredAt
                    ? `Delivered ${formatDate(shipment.deliveredAt)}`
                    : shipment.dispatchedAt
                      ? `Dispatched ${formatDate(shipment.dispatchedAt)}`
                      : `Created ${formatDate(shipment.createdAt)}`}
                </Text>
                {shipment.status === 'failed' && shipment.failureReason && (
                  <Text variant="caption" className="text-feedback-danger">
                    {shipment.failureReason}
                  </Text>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
