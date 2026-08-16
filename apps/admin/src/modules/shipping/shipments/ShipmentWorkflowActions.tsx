import { useState } from 'react';
import { PackageCheck, Package, PackageOpen, Truck, MapPinned, Home, XCircle, AlertTriangle } from 'lucide-react';
import { Button, Text } from '@nexgen/ui';
import type { ShipmentDTO } from '@nexgen/api-client';
import { ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { shippingErrorMessage } from '../shared/errors.js';
import { useStartPicking, useMarkPicked, useStartPacking, useMarkPacked, useMarkInTransit, useMarkDelivered } from './queries.js';
import { ShipmentDispatchDialog } from './ShipmentDispatchDialog.js';
import { ShipmentFailDialog } from './ShipmentFailDialog.js';
import { ShipmentCancelDialog } from './ShipmentCancelDialog.js';

export interface ShipmentWorkflowActionsProps {
  shipment: ShipmentDTO;
}

/**
 * The real Shipment Status Lifecycle's action bar — one button per genuinely
 * reachable next transition from `shipment.status`, confirmed against
 * `Models\Shipment::ALLOWED_TRANSITIONS` (read directly, not assumed) and
 * gated by the exact granular permission each real endpoint requires
 * (`fulfillment.shipments.{pick,pack,dispatch,cancel}` — confirmed via
 * `Authorization\PermissionRegistry.php`). A picker without dispatch
 * authority genuinely sees no Dispatch button at all, per that registry's
 * own least-privilege intent — `RequirePermission inline={null}` hides
 * each group entirely rather than showing it disabled-but-unusable.
 *
 * Three real backend preconditions are checked client-side, honestly,
 * before a button is even offered as clickable — never to invent a rule,
 * only to avoid presenting a control that the real backend will reject
 * with a 422 every time: `StartPickingAction`'s own `no_items` guard (at
 * least one item must exist), `MarkPackedAction`'s own `missing_weight`
 * guard (a recorded `weight_grams`), and `DispatchShipmentAction`'s own
 * `missing_destination` guard. As of Phase 2.8 Slice 3, all three can now
 * be resolved directly from this page — see `ShipmentDestinationDialog`/
 * `ShipmentItemFormDialog` and the Items/Destination cards on
 * `ShipmentDetailPage` — so each caption below points there instead of
 * declaring the gap unresolvable.
 */
export function ShipmentWorkflowActions({ shipment }: ShipmentWorkflowActionsProps) {
  const startPickingMutation = useStartPicking();
  const markPickedMutation = useMarkPicked();
  const startPackingMutation = useStartPacking();
  const markPackedMutation = useMarkPacked();
  const markInTransitMutation = useMarkInTransit();
  const markDeliveredMutation = useMarkDelivered();

  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [failOpen, setFailOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const hasItems = (shipment.items?.length ?? 0) > 0;
  const hasWeight = shipment.weightGrams !== null;
  const hasDestination = Boolean(
    shipment.destination.recipientName && shipment.destination.phone && shipment.destination.addressLine1 && shipment.destination.city && shipment.destination.countryCode,
  );

  const status = shipment.status;
  const canStartPicking = status === 'pending';
  const canMarkPicked = status === 'picking';
  const canStartPacking = status === 'picked';
  const canMarkPacked = status === 'packing';
  const canDispatch = status === 'packed';
  const canMarkInTransit = status === 'dispatched';
  const canMarkDelivered = status === 'dispatched' || status === 'in_transit';
  const canFail = status === 'picking' || status === 'packing' || status === 'dispatched' || status === 'in_transit';
  const canCancel = status === 'pending' || status === 'picking' || status === 'picked' || status === 'packing' || status === 'packed';

  const nothingAvailable = !canStartPicking && !canMarkPicked && !canStartPacking && !canDispatch && !canMarkInTransit && !canMarkDelivered && !canFail && !canCancel;

  if (nothingAvailable) {
    return (
      <Text variant="body" className="text-text-secondary">
        This shipment is in a final state — no further workflow action is available.
      </Text>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <RequirePermission anyOf={['fulfillment.shipments.pick']} inline={null}>
          {canStartPicking && (
            <ConfirmDialog
              trigger={
                <Button variant="outline" disabled={!hasItems}>
                  <PackageOpen className="size-4" /> Start picking
                </Button>
              }
              title="Start picking this shipment?"
              description="This shipment will move to Picking."
              confirmLabel="Start picking"
              onConfirm={async () => {
                await startPickingMutation.mutateAsync({ id: shipment.id, input: { expectedVersion: shipment.version } });
              }}
              getErrorMessage={shippingErrorMessage}
            />
          )}
          {canMarkPicked && (
            <ConfirmDialog
              trigger={
                <Button variant="outline">
                  <PackageCheck className="size-4" /> Mark picked
                </Button>
              }
              title="Mark this shipment picked?"
              description="All items have been picked. This shipment will move to Picked."
              confirmLabel="Mark picked"
              onConfirm={async () => {
                await markPickedMutation.mutateAsync({ id: shipment.id, input: { expectedVersion: shipment.version } });
              }}
              getErrorMessage={shippingErrorMessage}
            />
          )}
        </RequirePermission>

        <RequirePermission anyOf={['fulfillment.shipments.pack']} inline={null}>
          {canStartPacking && (
            <ConfirmDialog
              trigger={
                <Button variant="outline">
                  <Package className="size-4" /> Start packing
                </Button>
              }
              title="Start packing this shipment?"
              description="This shipment will move to Packing."
              confirmLabel="Start packing"
              onConfirm={async () => {
                await startPackingMutation.mutateAsync({ id: shipment.id, input: { expectedVersion: shipment.version } });
              }}
              getErrorMessage={shippingErrorMessage}
            />
          )}
          {canMarkPacked && (
            <ConfirmDialog
              trigger={
                <Button variant="outline" disabled={!hasWeight}>
                  <Package className="size-4" /> Mark packed
                </Button>
              }
              title="Mark this shipment packed?"
              description="This shipment is packed and ready for dispatch. It will move to Packed."
              confirmLabel="Mark packed"
              onConfirm={async () => {
                await markPackedMutation.mutateAsync({ id: shipment.id, input: { expectedVersion: shipment.version } });
              }}
              getErrorMessage={shippingErrorMessage}
            />
          )}
        </RequirePermission>

        <RequirePermission anyOf={['fulfillment.shipments.dispatch']} inline={null}>
          {canDispatch && (
            <Button variant="outline" disabled={!hasDestination} onClick={() => setDispatchOpen(true)}>
              <Truck className="size-4" /> Dispatch
            </Button>
          )}
          {canMarkInTransit && (
            <ConfirmDialog
              trigger={
                <Button variant="outline">
                  <MapPinned className="size-4" /> Mark in transit
                </Button>
              }
              title="Mark this shipment in transit?"
              description="This shipment will move to In Transit."
              confirmLabel="Mark in transit"
              onConfirm={async () => {
                await markInTransitMutation.mutateAsync({ id: shipment.id, input: { expectedVersion: shipment.version } });
              }}
              getErrorMessage={shippingErrorMessage}
            />
          )}
          {canMarkDelivered && (
            <ConfirmDialog
              trigger={
                <Button variant="outline">
                  <Home className="size-4" /> Mark delivered
                </Button>
              }
              title="Mark this shipment delivered?"
              description="This shipment will move to Delivered, a final state."
              confirmLabel="Mark delivered"
              onConfirm={async () => {
                await markDeliveredMutation.mutateAsync({ id: shipment.id, input: { expectedVersion: shipment.version } });
              }}
              getErrorMessage={shippingErrorMessage}
            />
          )}
        </RequirePermission>

        <RequirePermission anyOf={['fulfillment.shipments.cancel']} inline={null}>
          {canFail && (
            <Button variant="outline" className="text-feedback-danger hover:text-feedback-danger" onClick={() => setFailOpen(true)}>
              <AlertTriangle className="size-4" /> Mark failed
            </Button>
          )}
          {canCancel && (
            <Button variant="outline" className="text-feedback-danger hover:text-feedback-danger" onClick={() => setCancelOpen(true)}>
              <XCircle className="size-4" /> Cancel
            </Button>
          )}
        </RequirePermission>
      </div>

      {canStartPicking && !hasItems && (
        <Text variant="caption" className="text-feedback-danger">
          Start Picking is disabled — add at least one item below first.
        </Text>
      )}
      {canMarkPacked && !hasWeight && (
        <Text variant="caption" className="text-feedback-danger">
          Mark Packed is disabled — record this shipment&rsquo;s weight below first.
        </Text>
      )}
      {canDispatch && !hasDestination && (
        <Text variant="caption" className="text-feedback-danger">
          Dispatch is disabled — set a destination address below first.
        </Text>
      )}

      <ShipmentDispatchDialog open={dispatchOpen} onOpenChange={setDispatchOpen} shipment={shipment} />
      <ShipmentFailDialog open={failOpen} onOpenChange={setFailOpen} shipment={shipment} />
      <ShipmentCancelDialog open={cancelOpen} onOpenChange={setCancelOpen} shipment={shipment} />
    </div>
  );
}
