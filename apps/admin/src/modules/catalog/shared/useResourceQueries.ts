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

  function useResourceList(query?: TListQuery): UseQueryResult<ListEnvelope<TDTO>> {
    return useQuery({
      queryKey: [queryKeyBase, 'list', query],
      queryFn: () => api.list(query),
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

  return { useResourceList, useCreateResource, useUpdateResource, useArchiveResource, useDestroyResource, useRestoreResource };
}

export { apiClient };
