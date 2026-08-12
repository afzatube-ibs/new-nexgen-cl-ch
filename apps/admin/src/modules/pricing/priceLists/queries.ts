import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import {
  listPriceLists,
  getPriceList,
  createPriceList,
  updatePriceList,
  archivePriceList,
  destroyPriceList,
  createPriceListEntry,
  updatePriceListEntry,
  destroyPriceListEntry,
  type PriceListDTO,
  type PriceListEntryDTO,
  type CreatePriceListInput,
  type UpdatePriceListInput,
  type CreatePriceListEntryInput,
  type UpdatePriceListEntryInput,
  type ListPriceListsQuery,
  type ListEnvelope,
} from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';
import { fetchAllPages } from '../shared/pagination.js';

const QUERY_KEY = 'pricing-price-lists';

function useInvalidateList(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] });
    void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list-all'] });
  };
}

export function usePriceLists(query?: ListPriceListsQuery): UseQueryResult<ListEnvelope<PriceListDTO>> {
  return useQuery({ queryKey: [QUERY_KEY, 'list', query], queryFn: () => listPriceLists(apiClient, query) });
}

/** Every Price List, unpaginated — see `shared/pagination.ts`'s own docblock for why this scale of "fetch everything" is the right call for this specific entity. Feeds the list page's own full client-side search/filter/sort. */
export function useAllPriceLists(): UseQueryResult<PriceListDTO[]> {
  return useQuery({
    queryKey: [QUERY_KEY, 'list-all'],
    queryFn: () => fetchAllPages((page) => listPriceLists(apiClient, { page })),
  });
}

/** The only query that returns `entries` — `PriceListController::show` loads the full, unpaginated relationship. */
export function usePriceList(id: string | undefined): UseQueryResult<PriceListDTO> {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => getPriceList(apiClient, id as string),
    enabled: Boolean(id),
  });
}

export function useCreatePriceList(): UseMutationResult<PriceListDTO, unknown, CreatePriceListInput> {
  const invalidateList = useInvalidateList();
  return useMutation({ mutationFn: (input: CreatePriceListInput) => createPriceList(apiClient, input), onSuccess: invalidateList });
}

export function useUpdatePriceList(): UseMutationResult<PriceListDTO, unknown, { id: string; input: UpdatePriceListInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => updatePriceList(apiClient, id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list-all'] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
    },
  });
}

export function useArchivePriceList(): UseMutationResult<PriceListDTO, unknown, { id: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }) => archivePriceList(apiClient, id, expectedVersion),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list-all'] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
    },
  });
}

export function useDestroyPriceList(): UseMutationResult<void, unknown, { id: string; expectedVersion: number }> {
  const invalidateList = useInvalidateList();
  return useMutation({ mutationFn: ({ id, expectedVersion }) => destroyPriceList(apiClient, id, expectedVersion), onSuccess: invalidateList });
}

/**
 * Entry mutations invalidate their *parent* `PriceList`'s detail query
 * (`entries` only ever arrives bundled there — see `priceListEntries.ts`'s
 * own docblock) and the list query, since a list's "N priced" count is
 * derived from `entries.length` on whichever query rendered it.
 */
export function useCreatePriceListEntry(priceListId: string): UseMutationResult<PriceListEntryDTO, unknown, CreatePriceListEntryInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePriceListEntryInput) => createPriceListEntry(apiClient, priceListId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', priceListId] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list-all'] });
    },
  });
}

export function useUpdatePriceListEntry(
  priceListId: string,
): UseMutationResult<PriceListEntryDTO, unknown, { entryId: string; input: UpdatePriceListEntryInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, input }) => updatePriceListEntry(apiClient, priceListId, entryId, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', priceListId] }),
  });
}

export function useDestroyPriceListEntry(priceListId: string): UseMutationResult<void, unknown, { entryId: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, expectedVersion }) => destroyPriceListEntry(apiClient, priceListId, entryId, expectedVersion),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', priceListId] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list-all'] });
    },
  });
}
