import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import {
  listWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  archiveWarehouse,
  destroyWarehouse,
  restoreWarehouse,
  type WarehouseDTO,
  type CreateWarehouseInput,
  type UpdateWarehouseInput,
  type ListWarehousesQuery,
  type ListEnvelope,
} from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';
import { fetchAllPages } from '../shared/pagination.js';

const QUERY_KEY = 'inventory-warehouses';

function useInvalidate(): () => void {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
}

export function useWarehouses(query?: ListWarehousesQuery): UseQueryResult<ListEnvelope<WarehouseDTO>> {
  return useQuery({ queryKey: [QUERY_KEY, 'list', query], queryFn: () => listWarehouses(apiClient, query) });
}

/**
 * Every active warehouse, unpaginated — feeds the Adjust Stock dialog's
 * warehouse `<Select>` and the Stock Levels page's warehouse filter, both
 * of which need the complete set, not just page 1 (see `shared/
 * pagination.ts`'s own docblock for why this is safe at warehouse scale).
 */
export function useAllWarehouses(status?: ListWarehousesQuery['status']): UseQueryResult<WarehouseDTO[]> {
  return useQuery({
    queryKey: [QUERY_KEY, 'list-all', status],
    queryFn: () => fetchAllPages((page) => listWarehouses(apiClient, { status, page })),
  });
}

export function useWarehouse(id: string | undefined): UseQueryResult<WarehouseDTO> {
  return useQuery({ queryKey: [QUERY_KEY, 'detail', id], queryFn: () => getWarehouse(apiClient, id as string), enabled: Boolean(id) });
}

export function useCreateWarehouse(): UseMutationResult<WarehouseDTO, unknown, CreateWarehouseInput> {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (input: CreateWarehouseInput) => createWarehouse(apiClient, input), onSuccess: invalidate });
}

export function useUpdateWarehouse(): UseMutationResult<WarehouseDTO, unknown, { id: string; input: UpdateWarehouseInput }> {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ id, input }) => updateWarehouse(apiClient, id, input), onSuccess: invalidate });
}

export function useArchiveWarehouse(): UseMutationResult<WarehouseDTO, unknown, { id: string; expectedVersion: number }> {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ id, expectedVersion }) => archiveWarehouse(apiClient, id, expectedVersion), onSuccess: invalidate });
}

export function useDestroyWarehouse(): UseMutationResult<void, unknown, { id: string; expectedVersion: number }> {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ id, expectedVersion }) => destroyWarehouse(apiClient, id, expectedVersion), onSuccess: invalidate });
}

export function useRestoreWarehouse(): UseMutationResult<WarehouseDTO, unknown, string> {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => restoreWarehouse(apiClient, id), onSuccess: invalidate });
}
