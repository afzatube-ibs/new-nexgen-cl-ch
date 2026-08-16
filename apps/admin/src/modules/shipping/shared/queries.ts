import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import {
  listShippingZones,
  createShippingZone,
  updateShippingZone,
  archiveShippingZone,
  destroyShippingZone,
  listShippingMethods,
  createShippingMethod,
  updateShippingMethod,
  archiveShippingMethod,
  destroyShippingMethod,
  listShippingRates,
  createShippingRate,
  updateShippingRate,
  archiveShippingRate,
  destroyShippingRate,
  type ShippingZoneDTO,
  type CreateShippingZoneInput,
  type UpdateShippingZoneInput,
  type ShippingMethodDTO,
  type CreateShippingMethodInput,
  type UpdateShippingMethodInput,
  type ShippingRateDTO,
  type CreateShippingRateInput,
  type UpdateShippingRateInput,
} from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';
import { fetchAllPages } from './pagination.js';

/**
 * Zones/Methods/Rates configuration — same "fetch the complete, low-
 * cardinality collection once, search/filter/paginate entirely client-side"
 * shape `pricing/tax/queries.ts` already established and documented (see
 * `pagination.ts`'s own docblock for why this fits Shipping's own
 * real-world scale). Confirmed by reading `ShippingZoneController::index`/
 * `ShippingMethodController::index`/`ShippingRateController::index`
 * directly: none of the three support a `sort` or free-text `search` param.
 */

// ---------------------------------------------------------------------------
// ShippingZone
// ---------------------------------------------------------------------------

const ZONE_KEY = 'shipping-zones';

export function useAllShippingZones(): UseQueryResult<ShippingZoneDTO[]> {
  return useQuery({
    queryKey: [ZONE_KEY, 'list-all'],
    queryFn: () => fetchAllPages((page) => listShippingZones(apiClient, { page })),
  });
}

export function useCreateShippingZone(): UseMutationResult<ShippingZoneDTO, unknown, CreateShippingZoneInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateShippingZoneInput) => createShippingZone(apiClient, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [ZONE_KEY] }),
  });
}

export function useUpdateShippingZone(): UseMutationResult<ShippingZoneDTO, unknown, { id: string; input: UpdateShippingZoneInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => updateShippingZone(apiClient, id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [ZONE_KEY] }),
  });
}

export function useArchiveShippingZone(): UseMutationResult<ShippingZoneDTO, unknown, { id: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }) => archiveShippingZone(apiClient, id, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [ZONE_KEY] }),
  });
}

export function useDestroyShippingZone(): UseMutationResult<void, unknown, { id: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }) => destroyShippingZone(apiClient, id, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [ZONE_KEY] }),
  });
}

// ---------------------------------------------------------------------------
// ShippingMethod
// ---------------------------------------------------------------------------

const METHOD_KEY = 'shipping-methods';

export function useAllShippingMethods(): UseQueryResult<ShippingMethodDTO[]> {
  return useQuery({
    queryKey: [METHOD_KEY, 'list-all'],
    queryFn: () => fetchAllPages((page) => listShippingMethods(apiClient, { page })),
  });
}

export function useCreateShippingMethod(): UseMutationResult<ShippingMethodDTO, unknown, CreateShippingMethodInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateShippingMethodInput) => createShippingMethod(apiClient, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [METHOD_KEY] }),
  });
}

export function useUpdateShippingMethod(): UseMutationResult<ShippingMethodDTO, unknown, { id: string; input: UpdateShippingMethodInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => updateShippingMethod(apiClient, id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [METHOD_KEY] }),
  });
}

export function useArchiveShippingMethod(): UseMutationResult<ShippingMethodDTO, unknown, { id: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }) => archiveShippingMethod(apiClient, id, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [METHOD_KEY] }),
  });
}

export function useDestroyShippingMethod(): UseMutationResult<void, unknown, { id: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }) => destroyShippingMethod(apiClient, id, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [METHOD_KEY] }),
  });
}

// ---------------------------------------------------------------------------
// ShippingRate
// ---------------------------------------------------------------------------

const RATE_KEY = 'shipping-rates';

export function useAllShippingRates(): UseQueryResult<ShippingRateDTO[]> {
  return useQuery({
    queryKey: [RATE_KEY, 'list-all'],
    queryFn: () => fetchAllPages((page) => listShippingRates(apiClient, { page })),
  });
}

export function useCreateShippingRate(): UseMutationResult<ShippingRateDTO, unknown, CreateShippingRateInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateShippingRateInput) => createShippingRate(apiClient, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [RATE_KEY] }),
  });
}

export function useUpdateShippingRate(): UseMutationResult<ShippingRateDTO, unknown, { id: string; input: UpdateShippingRateInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => updateShippingRate(apiClient, id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [RATE_KEY] }),
  });
}

export function useArchiveShippingRate(): UseMutationResult<ShippingRateDTO, unknown, { id: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }) => archiveShippingRate(apiClient, id, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [RATE_KEY] }),
  });
}

export function useDestroyShippingRate(): UseMutationResult<void, unknown, { id: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }) => destroyShippingRate(apiClient, id, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [RATE_KEY] }),
  });
}
