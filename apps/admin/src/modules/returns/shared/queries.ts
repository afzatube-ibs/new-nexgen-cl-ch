import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import {
  listReturnRequests,
  getReturnRequest,
  createReturnRequest,
  approveReturnRequest,
  rejectReturnRequest,
  cancelReturnRequest,
  scheduleReturnPickup,
  markReturnReceived,
  startReturnInspection,
  resolveReturnRequest,
  addReturnNote,
  retryRefundRequest,
  startPreparingExchange,
  markExchangeShipped,
  completeExchange,
  cancelExchange,
  type ReturnRequestDTO,
  type ListReturnRequestsQuery,
  type CreateReturnRequestInput,
  type ReturnExpectedVersionInput,
  type RejectReturnRequestInput,
  type SchedulePickupInput,
  type ResolveReturnRequestInput,
  type AddReturnNoteInput,
  type ReturnNoteDTO,
  type RefundRequestDTO,
  type ExchangeRequestDTO,
  type MarkExchangeShippedInput,
  type ListEnvelope,
} from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

const QUERY_KEY = 'return-requests';

/**
 * `ReturnRequestController::index` — genuinely server-side `status`/
 * `order_id`/`customer_id`, hardcoded ordering, Laravel's own default
 * pagination. Real, server-driven pagination, mirroring Shipments' own
 * `useShipments` exactly, for the identical reason (real merchant return
 * volume is the same order of magnitude as Orders/Shipments themselves).
 */
export function useReturnRequests(query: ListReturnRequestsQuery): UseQueryResult<ListEnvelope<ReturnRequestDTO>> {
  return useQuery({ queryKey: [QUERY_KEY, 'list', query], queryFn: () => listReturnRequests(apiClient, query) });
}

/** `ReturnRequestController::show` — the only query that returns items/timeline/notes/refundRequest/exchangeRequest. */
export function useReturnRequest(id: string | undefined): UseQueryResult<ReturnRequestDTO> {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => getReturnRequest(apiClient, id as string),
    enabled: Boolean(id),
  });
}

export function useCreateReturnRequest(): UseMutationResult<ReturnRequestDTO, unknown, CreateReturnRequestInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => createReturnRequest(apiClient, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] }),
  });
}

// ---------------------------------------------------------------------------
// Workflow actions — one hook per real `ReturnRequestWorkflowController`
// endpoint. Each invalidates both this return's own detail (its
// `version`/`status`/timeline all change) and the Return Requests List (its
// `status` column changes) — the identical invalidation shape Shipments'
// own `useWorkflowMutation` established.
// ---------------------------------------------------------------------------

function useWorkflowMutation<TInput>(
  fn: (client: typeof apiClient, id: string, input: TInput) => Promise<ReturnRequestDTO>,
): UseMutationResult<ReturnRequestDTO, unknown, { id: string; input: TInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => fn(apiClient, id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
    },
  });
}

export function useApproveReturnRequest(): UseMutationResult<ReturnRequestDTO, unknown, { id: string; input: ReturnExpectedVersionInput }> {
  return useWorkflowMutation(approveReturnRequest);
}
export function useRejectReturnRequest(): UseMutationResult<ReturnRequestDTO, unknown, { id: string; input: RejectReturnRequestInput }> {
  return useWorkflowMutation(rejectReturnRequest);
}
export function useCancelReturnRequest(): UseMutationResult<ReturnRequestDTO, unknown, { id: string; input: ReturnExpectedVersionInput }> {
  return useWorkflowMutation(cancelReturnRequest);
}
export function useScheduleReturnPickup(): UseMutationResult<ReturnRequestDTO, unknown, { id: string; input: SchedulePickupInput }> {
  return useWorkflowMutation(scheduleReturnPickup);
}
export function useMarkReturnReceived(): UseMutationResult<ReturnRequestDTO, unknown, { id: string; input: ReturnExpectedVersionInput }> {
  return useWorkflowMutation(markReturnReceived);
}
export function useStartReturnInspection(): UseMutationResult<ReturnRequestDTO, unknown, { id: string; input: ReturnExpectedVersionInput }> {
  return useWorkflowMutation(startReturnInspection);
}
export function useResolveReturnRequest(): UseMutationResult<ReturnRequestDTO, unknown, { id: string; input: ResolveReturnRequestInput }> {
  return useWorkflowMutation(resolveReturnRequest);
}

export function useAddReturnNote(): UseMutationResult<ReturnNoteDTO, unknown, { id: string; input: AddReturnNoteInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => addReturnNote(apiClient, id, input),
    onSuccess: (_data, { id }) => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] }),
  });
}

// ---------------------------------------------------------------------------
// Refund / Exchange sub-panel actions. Both mutate a nested resource
// (`RefundRequest`/`ExchangeRequest`, each its own real aggregate root
// confirmed by reading `RefundRequest.php`/`ExchangeRequest.php` directly —
// see `types.ts`'s own docblock for each's real `TRANSITIONS`), but the
// Detail page reads them only through the parent `ReturnRequestDTO.
// refundRequest`/`.exchangeRequest` — invalidating the parent return's own
// detail query is what refreshes the sub-panel after either mutates.
// ---------------------------------------------------------------------------

export function useRetryRefundRequest(): UseMutationResult<RefundRequestDTO, unknown, { refundRequestId: string; returnRequestId: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ refundRequestId }) => retryRefundRequest(apiClient, refundRequestId),
    onSuccess: (_data, { returnRequestId }) => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', returnRequestId] }),
  });
}

function useExchangeMutation<TInput = void>(
  fn: (client: typeof apiClient, exchangeRequestId: string, input: TInput) => Promise<ExchangeRequestDTO>,
): UseMutationResult<ExchangeRequestDTO, unknown, { exchangeRequestId: string; returnRequestId: string; input: TInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ exchangeRequestId, input }) => fn(apiClient, exchangeRequestId, input),
    onSuccess: (_data, { returnRequestId }) => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', returnRequestId] }),
  });
}

export function useStartPreparingExchange(): UseMutationResult<ExchangeRequestDTO, unknown, { exchangeRequestId: string; returnRequestId: string; input: ReturnExpectedVersionInput }> {
  return useExchangeMutation(startPreparingExchange);
}
export function useMarkExchangeShipped(): UseMutationResult<ExchangeRequestDTO, unknown, { exchangeRequestId: string; returnRequestId: string; input: MarkExchangeShippedInput }> {
  return useExchangeMutation(markExchangeShipped);
}
export function useCompleteExchange(): UseMutationResult<ExchangeRequestDTO, unknown, { exchangeRequestId: string; returnRequestId: string; input: ReturnExpectedVersionInput }> {
  return useExchangeMutation(completeExchange);
}
export function useCancelExchange(): UseMutationResult<ExchangeRequestDTO, unknown, { exchangeRequestId: string; returnRequestId: string; input: ReturnExpectedVersionInput }> {
  return useExchangeMutation(cancelExchange);
}
