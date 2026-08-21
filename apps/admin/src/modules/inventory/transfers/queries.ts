import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import {
  listStockTransfers,
  getStockTransfer,
  initiateStockTransfer,
  completeStockTransfer,
  cancelStockTransfer,
  type StockTransferDTO,
  type InitiateStockTransferInput,
  type ListStockTransfersQuery,
  type ListEnvelope,
} from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

const QUERY_KEY = 'inventory-stock-transfers';

export function useStockTransfers(query?: ListStockTransfersQuery): UseQueryResult<ListEnvelope<StockTransferDTO>> {
  return useQuery({ queryKey: [QUERY_KEY, 'list', query], queryFn: () => listStockTransfers(apiClient, query) });
}

export function useStockTransfer(id: string | undefined): UseQueryResult<StockTransferDTO> {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => getStockTransfer(apiClient, id as string),
    enabled: Boolean(id),
  });
}

/**
 * `POST /stock-transfers` — invalidates the transfer list (a new pending
 * row just appeared), Stock Levels (the source item's `quantityReserved`/
 * `quantityAvailable` just changed — `InitiateStockTransferAction` places a
 * hold there immediately), and Activity (`stock_transfer.initiated`).
 */
export function useInitiateStockTransfer(): UseMutationResult<StockTransferDTO, unknown, InitiateStockTransferInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InitiateStockTransferInput) => initiateStockTransfer(apiClient, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-stock-items'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-audit-logs'] });
    },
  });
}

/**
 * `POST /stock-transfers/{id}/complete` — invalidates the same footprint as
 * initiating (both the source and destination `StockItem` rows just
 * changed, and a `stock_transfer.completed` entry was appended).
 */
export function useCompleteStockTransfer(): UseMutationResult<StockTransferDTO, unknown, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeStockTransfer(apiClient, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-stock-items'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-audit-logs'] });
    },
  });
}

/**
 * `POST /stock-transfers/{id}/cancel` — invalidates the same footprint;
 * only the source item's `quantityReserved`/`quantityAvailable` reverts
 * (the destination was never touched).
 */
export function useCancelStockTransfer(): UseMutationResult<StockTransferDTO, unknown, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelStockTransfer(apiClient, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-stock-items'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-audit-logs'] });
    },
  });
}
