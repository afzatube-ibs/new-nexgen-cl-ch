import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import {
  listTaxZones,
  createTaxZone,
  updateTaxZone,
  archiveTaxZone,
  destroyTaxZone,
  listTaxClasses,
  createTaxClass,
  updateTaxClass,
  archiveTaxClass,
  destroyTaxClass,
  listTaxRates,
  createTaxRate,
  updateTaxRate,
  archiveTaxRate,
  destroyTaxRate,
  type TaxZoneDTO,
  type CreateTaxZoneInput,
  type UpdateTaxZoneInput,
  type TaxClassDTO,
  type CreateTaxClassInput,
  type UpdateTaxClassInput,
  type TaxRateDTO,
  type CreateTaxRateInput,
  type UpdateTaxRateInput,
} from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';
import { fetchAllPages } from '../shared/pagination.js';

/**
 * Slice 3 — Tax Zones/Classes/Rates. Same "fetch the complete, low-
 * cardinality collection once, search/sort/filter/paginate entirely
 * client-side" shape `priceLists/queries.ts` already established and
 * documented — none of `TaxZoneController::index`/`TaxClassController::
 * index`/`TaxRateController::index` support a `sort` or free-text `search`
 * param (confirmed by reading each controller directly), and a merchant's
 * real set of zones/classes/rates is small (one zone per jurisdiction, one
 * class per tax category, one rate per zone×class pair) — the same
 * real-world-scale reasoning, not a new assumption.
 */

// ---------------------------------------------------------------------------
// TaxZone
// ---------------------------------------------------------------------------

const ZONE_KEY = 'pricing-tax-zones';

export function useAllTaxZones(): UseQueryResult<TaxZoneDTO[]> {
  return useQuery({
    queryKey: [ZONE_KEY, 'list-all'],
    queryFn: () => fetchAllPages((page) => listTaxZones(apiClient, { page })),
  });
}

export function useCreateTaxZone(): UseMutationResult<TaxZoneDTO, unknown, CreateTaxZoneInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaxZoneInput) => createTaxZone(apiClient, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [ZONE_KEY] }),
  });
}

export function useUpdateTaxZone(): UseMutationResult<TaxZoneDTO, unknown, { id: string; input: UpdateTaxZoneInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => updateTaxZone(apiClient, id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [ZONE_KEY] }),
  });
}

export function useArchiveTaxZone(): UseMutationResult<TaxZoneDTO, unknown, { id: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }) => archiveTaxZone(apiClient, id, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [ZONE_KEY] }),
  });
}

export function useDestroyTaxZone(): UseMutationResult<void, unknown, { id: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }) => destroyTaxZone(apiClient, id, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [ZONE_KEY] }),
  });
}

// ---------------------------------------------------------------------------
// TaxClass
// ---------------------------------------------------------------------------

const CLASS_KEY = 'pricing-tax-classes';

export function useAllTaxClasses(): UseQueryResult<TaxClassDTO[]> {
  return useQuery({
    queryKey: [CLASS_KEY, 'list-all'],
    queryFn: () => fetchAllPages((page) => listTaxClasses(apiClient, { page })),
  });
}

export function useCreateTaxClass(): UseMutationResult<TaxClassDTO, unknown, CreateTaxClassInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaxClassInput) => createTaxClass(apiClient, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [CLASS_KEY] }),
  });
}

export function useUpdateTaxClass(): UseMutationResult<TaxClassDTO, unknown, { id: string; input: UpdateTaxClassInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => updateTaxClass(apiClient, id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [CLASS_KEY] }),
  });
}

export function useArchiveTaxClass(): UseMutationResult<TaxClassDTO, unknown, { id: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }) => archiveTaxClass(apiClient, id, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [CLASS_KEY] }),
  });
}

export function useDestroyTaxClass(): UseMutationResult<void, unknown, { id: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }) => destroyTaxClass(apiClient, id, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [CLASS_KEY] }),
  });
}

// ---------------------------------------------------------------------------
// TaxRate
// ---------------------------------------------------------------------------

const RATE_KEY = 'pricing-tax-rates';

/** Every Tax Rate, unpaginated — `status`/`tax_zone_id`/`tax_class_id` filters (the only ones the real backend supports) applied client-side against the full set, same reasoning as `useAllTaxZones`/`useAllTaxClasses` above. */
export function useAllTaxRates(): UseQueryResult<TaxRateDTO[]> {
  return useQuery({
    queryKey: [RATE_KEY, 'list-all'],
    queryFn: () => fetchAllPages((page) => listTaxRates(apiClient, { page })),
  });
}

export function useCreateTaxRate(): UseMutationResult<TaxRateDTO, unknown, CreateTaxRateInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaxRateInput) => createTaxRate(apiClient, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [RATE_KEY] }),
  });
}

export function useUpdateTaxRate(): UseMutationResult<TaxRateDTO, unknown, { id: string; input: UpdateTaxRateInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => updateTaxRate(apiClient, id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [RATE_KEY] }),
  });
}

export function useArchiveTaxRate(): UseMutationResult<TaxRateDTO, unknown, { id: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }) => archiveTaxRate(apiClient, id, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [RATE_KEY] }),
  });
}

export function useDestroyTaxRate(): UseMutationResult<void, unknown, { id: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }) => destroyTaxRate(apiClient, id, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [RATE_KEY] }),
  });
}
