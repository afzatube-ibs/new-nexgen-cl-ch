import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import {
  listPayments,
  getPayment,
  listPaymentMethods,
  capturePayment,
  cancelPayment,
  voidPayment,
  attachBankTransferProof,
  approveBankTransfer,
  rejectBankTransfer,
  type PaymentDTO,
  type ListPaymentsQuery,
  type ListEnvelope,
  type PaymentMethodDTO,
  type PaymentExpectedVersionInput,
  type PaymentReasonInput,
  type AttachBankTransferProofInput,
} from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

const QUERY_KEY = 'payments';

/**
 * `PaymentController::index` — genuinely server-side `order_id`/
 * `customer_id`/`status`, hardcoded `orderByDesc('initiated_at')`,
 * Laravel's own default pagination. No free-text search, no `gateway_code`
 * filter — confirmed absent by reading the controller directly. Real,
 * server-driven pagination, matching Shipments'/Orders' own precedent for a
 * list whose real volume can reach "hundreds or thousands."
 */
export function usePayments(query: ListPaymentsQuery): UseQueryResult<ListEnvelope<PaymentDTO>> {
  return useQuery({ queryKey: [QUERY_KEY, 'list', query], queryFn: () => listPayments(apiClient, query) });
}

/** `PaymentController::show` — the only query that returns `attempts` (the real transaction/timeline ledger). */
export function usePayment(id: string | undefined): UseQueryResult<PaymentDTO> {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => getPayment(apiClient, id as string),
    enabled: Boolean(id),
  });
}

/** `GET /payments/methods` — the real gateway registry, used to resolve a raw `gatewayCode` to its real label. Rarely changes — a 5-minute `staleTime` avoids refetching it on every List/Detail visit, matching `useStaffDirectory()`'s own precedent. */
export function usePaymentMethods(): UseQueryResult<ListEnvelope<PaymentMethodDTO>> {
  return useQuery({ queryKey: [QUERY_KEY, 'methods'], queryFn: () => listPaymentMethods(apiClient), staleTime: 5 * 60 * 1000 });
}

// ---------------------------------------------------------------------------
// Merchant Payment Operations — Phase 2.9 Slice 2. One hook per real
// `PaymentActionController`/`BankTransferVerificationController` endpoint;
// each invalidates both this payment's own detail (its `version`/`status`/
// `attempts` all change) and the Payments List (its `status` column
// changes) — the identical invalidation shape Shipping's own
// `useWorkflowMutation` established.
// ---------------------------------------------------------------------------

function usePaymentMutation<TInput>(
  fn: (client: typeof apiClient, id: string, input: TInput) => Promise<PaymentDTO>,
): UseMutationResult<PaymentDTO, unknown, { id: string; input: TInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => fn(apiClient, id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
    },
  });
}

export function useCapturePayment(): UseMutationResult<PaymentDTO, unknown, { id: string; input: PaymentExpectedVersionInput }> {
  return usePaymentMutation(capturePayment);
}
export function useCancelPayment(): UseMutationResult<PaymentDTO, unknown, { id: string; input: PaymentReasonInput }> {
  return usePaymentMutation(cancelPayment);
}
export function useVoidPayment(): UseMutationResult<PaymentDTO, unknown, { id: string; input: PaymentReasonInput }> {
  return usePaymentMutation(voidPayment);
}
export function useAttachBankTransferProof(): UseMutationResult<PaymentDTO, unknown, { id: string; input: AttachBankTransferProofInput }> {
  return usePaymentMutation(attachBankTransferProof);
}
export function useApproveBankTransfer(): UseMutationResult<PaymentDTO, unknown, { id: string; input: PaymentExpectedVersionInput }> {
  return usePaymentMutation(approveBankTransfer);
}
export function useRejectBankTransfer(): UseMutationResult<PaymentDTO, unknown, { id: string; input: PaymentReasonInput }> {
  return usePaymentMutation(rejectBankTransfer);
}
