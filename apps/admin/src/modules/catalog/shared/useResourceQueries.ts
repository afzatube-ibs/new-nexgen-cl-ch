import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import type { ListEnvelope } from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

/**
 * Every Catalog taxonomy entity (Brands, Categories, Collections, Tags,
 * Attribute Groups, Attributes, Options) is queried/mutated the same way —
 * TanStack Query (ADR-0005) wrapping the entity's own `@nexgen/api-client`
 * functions, invalidating the list on every write. This factory implements
 * that once; each entity's own file supplies only its typed functions —
 * never re-implementing cache/query-key/invalidation logic per entity.
 */
export interface ResourceApi<TDTO extends { id: string }, TCreate, TUpdate, TListQuery> {
  list: (query?: TListQuery) => Promise<ListEnvelope<TDTO>>;
  create: (input: TCreate) => Promise<TDTO>;
  update: (id: string, input: TUpdate) => Promise<TDTO>;
  /** Omitted for entities with no `status` column (Tags, Attribute Groups, Attributes, Options) — they have `destroy`/`restore` only. */
  archive?: (id: string, expectedVersion: number) => Promise<TDTO>;
  destroy: (id: string, expectedVersion: number) => Promise<void>;
  restore: (id: string) => Promise<TDTO>;
}

export function createResourceHooks<TDTO extends { id: string }, TCreate, TUpdate, TListQuery = Record<string, unknown>>(
  queryKeyBase: string,
  api: ResourceApi<TDTO, TCreate, TUpdate, TListQuery>,
) {
  function useInvalidate(): () => void {
    const queryClient = useQueryClient();
    return () => void queryClient.invalidateQueries({ queryKey: [queryKeyBase] });
  }

  /**
   * `options.enabled` defaults to `true` (every pre-existing caller omits
   * it and keeps firing immediately, unchanged) — added for
   * `RelatedProductsCard` (Slice 2), which must NOT fetch the entire
   * product list on every mount just because its search box exists; it
   * only wants a query once the operator has typed something. A real bug
   * this fixes, found via e2e testing: without this, opening any existing
   * product's editor fired an unbounded `GET /products` every time,
   * independent of `search`.
   */
  function useResourceList(query?: TListQuery, options?: { enabled?: boolean }): UseQueryResult<ListEnvelope<TDTO>> {
    return useQuery({
      queryKey: [queryKeyBase, 'list', query],
      queryFn: () => api.list(query),
      enabled: options?.enabled ?? true,
    });
  }

  /**
   * Every backend `index()` this factory talks to calls `->paginate()`
   * (Laravel's default 15-per-page) — correct for a browsing *table*
   * (`useResourceList` above, paired with the real `Pagination` UI), but
   * wrong for a *selector*: the Product Editor's Brand dropdown and
   * Categories/Collections/Tags/Options checklists all called the plain
   * first-page hook with no `page` argument, so a merchant with more than
   * 15 of any of them could never see — let alone select — the 16th one
   * anywhere in the Product Editor. Found via a Product Owner acceptance
   * audit of Phase 2.2 (2026-08-11), auditing every selector specifically
   * for this after the identical bug was already found and fixed on the
   * list-browsing pages themselves.
   *
   * Fixed here, once, for every entity that uses this factory: follow the
   * existing pagination to its end and return every record, using only the
   * `page` parameter the backend and `ListQuery` type already support — no
   * new endpoint, no new query parameter, just repeating an existing
   * request until `meta.last_page` is reached. A merchant's taxonomy
   * dictionaries (categories, tags, brands, options) are realistically in
   * the tens-to-low-hundreds, so a handful of sequential 15-per-page
   * requests, cached by TanStack Query, is a reasonable cost for
   * guaranteeing completeness regardless of count — unlike Products itself
   * (genuinely 100k+ at scale), which keeps its own real, paginated
   * `useResourceList` and never needs this.
   */
  function useResourceListAll(
    query?: Omit<TListQuery, 'page'>,
    options?: { enabled?: boolean },
  ): UseQueryResult<TDTO[]> {
    return useQuery({
      queryKey: [queryKeyBase, 'list-all', query],
      queryFn: async () => {
        const firstPage = await api.list({ ...query, page: 1 } as TListQuery);
        const items = [...firstPage.data];
        const lastPage = firstPage.meta?.last_page ?? 1;
        for (let page = 2; page <= lastPage; page++) {
          const nextPage = await api.list({ ...query, page } as TListQuery);
          items.push(...nextPage.data);
        }
        return items;
      },
      enabled: options?.enabled ?? true,
    });
  }

  function useCreateResource(): UseMutationResult<TDTO, unknown, TCreate> {
    const invalidate = useInvalidate();
    return useMutation({ mutationFn: (input: TCreate) => api.create(input), onSuccess: invalidate });
  }

  function useUpdateResource(): UseMutationResult<TDTO, unknown, { id: string; input: TUpdate }> {
    const invalidate = useInvalidate();
    return useMutation({ mutationFn: ({ id, input }) => api.update(id, input), onSuccess: invalidate });
  }

  function useArchiveResource(): UseMutationResult<TDTO, unknown, { id: string; expectedVersion: number }> {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: ({ id, expectedVersion }) => {
        if (!api.archive) throw new Error(`"${queryKeyBase}" has no archive action.`);
        return api.archive(id, expectedVersion);
      },
      onSuccess: invalidate,
    });
  }

  function useDestroyResource(): UseMutationResult<void, unknown, { id: string; expectedVersion: number }> {
    const invalidate = useInvalidate();
    return useMutation({ mutationFn: ({ id, expectedVersion }) => api.destroy(id, expectedVersion), onSuccess: invalidate });
  }

  function useRestoreResource(): UseMutationResult<TDTO, unknown, string> {
    const invalidate = useInvalidate();
    return useMutation({ mutationFn: (id: string) => api.restore(id), onSuccess: invalidate });
  }

  return { useResourceList, useResourceListAll, useCreateResource, useUpdateResource, useArchiveResource, useDestroyResource, useRestoreResource };
}

export { apiClient };
