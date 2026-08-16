import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import {
  listShipments,
  getShipment,
  startPicking,
  markPicked,
  startPacking,
  markPacked,
  dispatchShipment,
  markInTransit,
  markDelivered,
  markFailed,
  cancelShipment,
  setShipmentDestination,
  addShipmentItem,
  removeShipmentItem,
  addShipmentNote,
  type ShipmentDTO,
  type ShipmentItemDTO,
  type ShipmentNoteDTO,
  type ListShipmentsQuery,
  type ListEnvelope,
  type ExpectedVersionInput,
  type DispatchShipmentInput,
  type MarkFailedInput,
  type CancelShipmentInput,
  type SetShipmentDestinationInput,
  type AddShipmentItemInput,
  type AddShipmentNoteInput,
} from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

const QUERY_KEY = 'shipping-shipments';

/**
 * `ShipmentController::index` — genuinely server-side `status`/`order_id`,
 * hardcoded `orderByDesc('created_at')`, Laravel's own default pagination.
 * Real, server-driven pagination (not `fetchAllPages`) — a merchant's real
 * shipment volume is the same "hundreds or thousands" order of magnitude as
 * Orders itself, confirmed by the 1:1 relationship every placed Order has
 * with a Shipment (`CreateShipmentOnOrderPlaced`).
 */
export function useShipments(query: ListShipmentsQuery): UseQueryResult<ListEnvelope<ShipmentDTO>> {
  return useQuery({ queryKey: [QUERY_KEY, 'list', query], queryFn: () => listShipments(apiClient, query) });
}

/** `ShipmentController::show` — the only query that returns items/timeline/notes. */
export function useShipment(id: string | undefined): UseQueryResult<ShipmentDTO> {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => getShipment(apiClient, id as string),
    enabled: Boolean(id),
  });
}

// ---------------------------------------------------------------------------
// Workflow actions — Phase 2.8 Slice 2. One hook per real
// `ShipmentWorkflowController` endpoint; each invalidates both this
// shipment's own detail (its `version`/`status`/timeline all change) and
// the Shipments List (its `status` column changes) — the identical
// invalidation shape Orders' own `useTransitionMutation` established.
// ---------------------------------------------------------------------------

function useWorkflowMutation<TInput>(
  fn: (client: typeof apiClient, id: string, input: TInput) => Promise<ShipmentDTO>,
): UseMutationResult<ShipmentDTO, unknown, { id: string; input: TInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => fn(apiClient, id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
    },
  });
}

export function useStartPicking(): UseMutationResult<ShipmentDTO, unknown, { id: string; input: ExpectedVersionInput }> {
  return useWorkflowMutation(startPicking);
}
export function useMarkPicked(): UseMutationResult<ShipmentDTO, unknown, { id: string; input: ExpectedVersionInput }> {
  return useWorkflowMutation(markPicked);
}
export function useStartPacking(): UseMutationResult<ShipmentDTO, unknown, { id: string; input: ExpectedVersionInput }> {
  return useWorkflowMutation(startPacking);
}
export function useMarkPacked(): UseMutationResult<ShipmentDTO, unknown, { id: string; input: ExpectedVersionInput }> {
  return useWorkflowMutation(markPacked);
}
export function useDispatchShipment(): UseMutationResult<ShipmentDTO, unknown, { id: string; input: DispatchShipmentInput }> {
  return useWorkflowMutation(dispatchShipment);
}
export function useMarkInTransit(): UseMutationResult<ShipmentDTO, unknown, { id: string; input: ExpectedVersionInput }> {
  return useWorkflowMutation(markInTransit);
}
export function useMarkDelivered(): UseMutationResult<ShipmentDTO, unknown, { id: string; input: ExpectedVersionInput }> {
  return useWorkflowMutation(markDelivered);
}
export function useMarkFailed(): UseMutationResult<ShipmentDTO, unknown, { id: string; input: MarkFailedInput }> {
  return useWorkflowMutation(markFailed);
}
export function useCancelShipment(): UseMutationResult<ShipmentDTO, unknown, { id: string; input: CancelShipmentInput }> {
  return useWorkflowMutation(cancelShipment);
}

// ---------------------------------------------------------------------------
// Shipment Preparation — Phase 2.8 Slice 3. Destination/weight, items, and
// notes, all under `fulfillment.shipments.manage` (a distinct permission
// from the four workflow ones above). Same invalidation shape.
// ---------------------------------------------------------------------------

export function useSetShipmentDestination(): UseMutationResult<ShipmentDTO, unknown, { id: string; input: SetShipmentDestinationInput }> {
  return useWorkflowMutation(setShipmentDestination);
}

export function useAddShipmentItem(): UseMutationResult<ShipmentItemDTO, unknown, { id: string; input: AddShipmentItemInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => addShipmentItem(apiClient, id, input),
    onSuccess: (_data, { id }) => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] }),
  });
}

export function useRemoveShipmentItem(): UseMutationResult<void, unknown, { id: string; itemId: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, itemId }) => removeShipmentItem(apiClient, id, itemId),
    onSuccess: (_data, { id }) => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] }),
  });
}

export function useAddShipmentNote(): UseMutationResult<ShipmentNoteDTO, unknown, { id: string; input: AddShipmentNoteInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => addShipmentNote(apiClient, id, input),
    // `AddShipmentNoteAction` also writes a real timeline event ("A note was
    // added."), confirmed by reading it directly — invalidating the detail
    // query is what refreshes both the Notes list and the Timeline together.
    onSuccess: (_data, { id }) => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] }),
  });
}
