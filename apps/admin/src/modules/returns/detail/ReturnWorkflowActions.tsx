import { useState } from 'react';
import { CheckCircle2, XCircle, Ban, Truck, PackageCheck, Search, ClipboardCheck } from 'lucide-react';
import { Button, Text } from '@nexgen/ui';
import type { ReturnRequestDTO } from '@nexgen/api-client';
import { ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { returnsErrorMessage } from '../shared/errors.js';
import { useApproveReturnRequest, useCancelReturnRequest, useMarkReturnReceived, useStartReturnInspection } from '../shared/queries.js';
import { ReturnRejectDialog } from './ReturnRejectDialog.js';
import { ReturnSchedulePickupDialog } from './ReturnSchedulePickupDialog.js';
import { ReturnResolveDialog } from './ReturnResolveDialog.js';

export interface ReturnWorkflowActionsProps {
  returnRequest: ReturnRequestDTO;
}

/**
 * The real Return Status Lifecycle's action bar — one button per genuinely
 * reachable next transition from `returnRequest.status`, confirmed against
 * `Models\ReturnRequest::ALLOWED_TRANSITIONS` (read directly) and gated by
 * the exact granular permission each real endpoint requires
 * (`returns.requests.{approve,cancel,manage,inspect,resolve}` — confirmed
 * via `routes.php`). Mirrors `ShipmentWorkflowActions`'s own shape exactly —
 * `ReturnRequestWorkflowController`'s own docblock states it does the same.
 *
 * Unlike Shipment, no client-side backend precondition needs pre-checking
 * here: `CreateReturnRequestRequest` already guarantees at least one item
 * exists at creation time, so there is no "no items" 422 to guard against
 * the way `StartPickingAction` has.
 */
export function ReturnWorkflowActions({ returnRequest }: ReturnWorkflowActionsProps) {
  const approveMutation = useApproveReturnRequest();
  const cancelMutation = useCancelReturnRequest();
  const markReceivedMutation = useMarkReturnReceived();
  const startInspectionMutation = useStartReturnInspection();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [pickupOpen, setPickupOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);

  const status = returnRequest.status;
  const canApprove = status === 'requested';
  const canReject = status === 'requested' || status === 'approved' || status === 'pickup_scheduled' || status === 'received' || status === 'inspecting';
  const canCancel = status === 'requested' || status === 'approved' || status === 'pickup_scheduled';
  const canSchedulePickup = status === 'approved';
  const canMarkReceived = status === 'pickup_scheduled';
  const canStartInspection = status === 'received';
  const canResolve = status === 'inspecting';

  const nothingAvailable = !canApprove && !canReject && !canCancel && !canSchedulePickup && !canMarkReceived && !canStartInspection && !canResolve;

  if (nothingAvailable) {
    return (
      <Text variant="body" className="text-text-secondary">
        This return request is in a final state — no further workflow action is available.
      </Text>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <RequirePermission anyOf={['returns.requests.approve']} inline={null}>
        {canApprove && (
          <ConfirmDialog
            trigger={
              <Button variant="outline">
                <CheckCircle2 className="size-4" /> Approve
              </Button>
            }
            title="Approve this return request?"
            description="This return request will move to Approved."
            confirmLabel="Approve"
            onConfirm={async () => {
              await approveMutation.mutateAsync({ id: returnRequest.id, input: { expectedVersion: returnRequest.version } });
            }}
            getErrorMessage={returnsErrorMessage}
          />
        )}
        {canReject && (
          <Button variant="outline" className="text-feedback-danger hover:text-feedback-danger" onClick={() => setRejectOpen(true)}>
            <XCircle className="size-4" /> Reject
          </Button>
        )}
      </RequirePermission>

      <RequirePermission anyOf={['returns.requests.manage']} inline={null}>
        {canSchedulePickup && (
          <Button variant="outline" onClick={() => setPickupOpen(true)}>
            <Truck className="size-4" /> Schedule pickup
          </Button>
        )}
      </RequirePermission>

      <RequirePermission anyOf={['returns.requests.inspect']} inline={null}>
        {canMarkReceived && (
          <ConfirmDialog
            trigger={
              <Button variant="outline">
                <PackageCheck className="size-4" /> Mark received
              </Button>
            }
            title="Mark this return received?"
            description="This return request will move to Received."
            confirmLabel="Mark received"
            onConfirm={async () => {
              await markReceivedMutation.mutateAsync({ id: returnRequest.id, input: { expectedVersion: returnRequest.version } });
            }}
            getErrorMessage={returnsErrorMessage}
          />
        )}
        {canStartInspection && (
          <ConfirmDialog
            trigger={
              <Button variant="outline">
                <Search className="size-4" /> Start inspection
              </Button>
            }
            title="Start inspecting this return?"
            description="This return request will move to Inspecting."
            confirmLabel="Start inspection"
            onConfirm={async () => {
              await startInspectionMutation.mutateAsync({ id: returnRequest.id, input: { expectedVersion: returnRequest.version } });
            }}
            getErrorMessage={returnsErrorMessage}
          />
        )}
      </RequirePermission>

      <RequirePermission anyOf={['returns.requests.resolve']} inline={null}>
        {canResolve && (
          <Button onClick={() => setResolveOpen(true)}>
            <ClipboardCheck className="size-4" /> Resolve
          </Button>
        )}
      </RequirePermission>

      <RequirePermission anyOf={['returns.requests.cancel']} inline={null}>
        {canCancel && (
          <ConfirmDialog
            trigger={
              <Button variant="outline" className="text-feedback-danger hover:text-feedback-danger">
                <Ban className="size-4" /> Cancel
              </Button>
            }
            title="Cancel this return request?"
            description="This return request will move to Cancelled, a final state."
            confirmLabel="Cancel request"
            destructive
            onConfirm={async () => {
              await cancelMutation.mutateAsync({ id: returnRequest.id, input: { expectedVersion: returnRequest.version } });
            }}
            getErrorMessage={returnsErrorMessage}
          />
        )}
      </RequirePermission>

      <ReturnRejectDialog open={rejectOpen} onOpenChange={setRejectOpen} returnRequest={returnRequest} />
      <ReturnSchedulePickupDialog open={pickupOpen} onOpenChange={setPickupOpen} returnRequest={returnRequest} />
      <ReturnResolveDialog open={resolveOpen} onOpenChange={setResolveOpen} returnRequest={returnRequest} />
    </div>
  );
}
