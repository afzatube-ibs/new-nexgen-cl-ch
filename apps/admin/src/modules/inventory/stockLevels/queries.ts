import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import {
  listStockItems,
  adjustStock,
  listStockItemAdjustments,
  listStockItemReservations,
  reserveStock,
  releaseReservation,
  getStockItem,
  type StockItemDTO,
  type ListStockItemsQuery,
  type AdjustStockInput,
  type StockAdjustmentDTO,
  type StockReservationDTO,
  type ReserveStockInput,
  type ListEnvelope,
} from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

const QUERY_KEY = 'inventory-stock-items';

export function useStockItems(query?: ListStockItemsQuery): UseQueryResult<ListEnvelope<StockItemDTO>> {
  return useQuery({ queryKey: [QUERY_KEY, 'list', query], queryFn: () => listStockItems(apiClient, query) });
}

/** Resolves a bare StockItem id to its full record — used by the Movement History feed to show `sku`/`warehouseId` for a `stock.adjusted` audit-log entry, which the log itself only carries as a `targetId`. Cached indefinitely per id (a StockItem's own identity fields never change after creation). */
export function useStockItemById(id: string | undefined): UseQueryResult<StockItemDTO> {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => getStockItem(apiClient, id as string),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStockItemAdjustments(stockItemId: string | undefined, page: number): UseQueryResult<ListEnvelope<StockAdjustmentDTO>> {
  return useQuery({
    queryKey: [QUERY_KEY, 'adjustments', stockItemId, page],
    queryFn: () => listStockItemAdjustments(apiClient, stockItemId as string, { page }),
    enabled: Boolean(stockItemId),
  });
}

/**
 * The exact `warehouse_id` + `sku` filter `StockItemController::index`
 * already supports — used by the Adjust Stock dialog's "Current stock"
 * preview so a merchant sees the real on-hand quantity before submitting,
 * not just after. Absence of a matching row is a legitimate, common answer
 * ("this SKU has never been recorded in this warehouse yet"), not an error.
 */
export function useCurrentStockItem(warehouseId: string | undefined, sku: string | undefined): UseQueryResult<ListEnvelope<StockItemDTO>> {
  return useQuery({
    queryKey: [QUERY_KEY, 'current', warehouseId, sku],
    queryFn: () => listStockItems(apiClient, { warehouseId, sku, page: 1 }),
    enabled: Boolean(warehouseId && sku),
  });
}

/**
 * `POST /stock-items/adjust` — invalidates both the Stock Levels list (the
 * item's on-hand/available numbers just changed) and the Inventory Activity
 * feed (`inventory-audit-logs`, the same mutation appends a `stock.adjusted`
 * entry there) so a merchant doesn't need a manual refresh to see either
 * reflect the adjustment they just made.
 */
export function useAdjustStock(): UseMutationResult<StockItemDTO, unknown, AdjustStockInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdjustStockInput) => adjustStock(apiClient, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-audit-logs'] });
    },
  });
}

const RESERVATIONS_QUERY_KEY = 'inventory-reservations';

/** `GET /stock-items/{id}/reservations` — per-item only, no cross-item list endpoint exists (Slice 2 scope, per the architecture doc). */
export function useStockItemReservations(stockItemId: string | undefined, page: number): UseQueryResult<ListEnvelope<StockReservationDTO>> {
  return useQuery({
    queryKey: [RESERVATIONS_QUERY_KEY, 'list', stockItemId, page],
    queryFn: () => listStockItemReservations(apiClient, stockItemId as string, { page }),
    enabled: Boolean(stockItemId),
  });
}

/**
 * `POST /stock-items/{id}/reservations` — invalidates this item's own
 * reservation list, the Stock Levels list (`quantityReserved`/
 * `quantityAvailable` just changed), and Activity (the same action appends
 * a `stock.reserved` audit-log entry).
 */
export function useReserveStock(stockItemId: string): UseMutationResult<StockReservationDTO, unknown, ReserveStockInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReserveStockInput) => reserveStock(apiClient, stockItemId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [RESERVATIONS_QUERY_KEY, 'list', stockItemId] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-audit-logs'] });
    },
  });
}

/** `POST /reservations/{id}/release` — same invalidation footprint as placing one (the hold's release also changes `quantityReserved`/`quantityAvailable` and appends a `stock.released` audit-log entry). */
export function useReleaseReservation(stockItemId: string): UseMutationResult<StockReservationDTO, unknown, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: string) => releaseReservation(apiClient, reservationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [RESERVATIONS_QUERY_KEY, 'list', stockItemId] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-audit-logs'] });
    },
  });
}
