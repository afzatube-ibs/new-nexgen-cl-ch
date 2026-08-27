import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import {
  listStores,
  updateStore,
  getStoreAppearance,
  updateStoreAppearance,
  publishStoreAppearance,
  resetStoreAppearance,
  uploadMedia,
  type StoreAppearanceDTO,
  type UpdateStoreAppearanceInput,
  type UpdateStoreInput,
  type MediaAssetDTO,
  type StoreDTO,
} from '@nexgen/api-client';
import { apiClient } from '../../lib/apiClient.js';

/**
 * Beta Experience Pack 1 — Appearance's own query layer. `useCurrentStore`
 * is the same real `GET /stores` call `WorkspaceSwitcher.tsx` already
 * makes (Phase 1's own single-store scope — real `data[0]`, never a
 * fabricated placeholder store), shared here under its own query key so
 * both consumers hit the same TanStack Query cache entry rather than two
 * independent fetches of identical data.
 */
const STORE_KEY = ['stores'];
const APPEARANCE_KEY = (storeId: string) => ['appearance', storeId];

/**
 * Real bug found and fixed live (this Pack's own first browser
 * verification): this hook originally used the identical `['stores']`
 * query key `WorkspaceSwitcher.tsx` already uses, but with a DIFFERENT
 * queryFn (`stores[0]` — a single object) than that component's own
 * (the raw `StoreDTO[]`). TanStack Query dedupes by key, not by queryFn —
 * whichever observer's fetch actually populated the shared cache entry
 * for that key wins the *shape* for every observer on it, so this hook
 * intermittently received the raw array instead of the single store,
 * crashing the first real consumer (`store.address` on an array).
 * Fixed by matching `WorkspaceSwitcher`'s own real shape exactly (the
 * array) — real request deduplication is preserved (both components
 * still share one real `GET /stores` call), and `[0]` is picked once,
 * here, by every consumer independently.
 */
export function useCurrentStore(): UseQueryResult<StoreDTO[]> {
  return useQuery({
    queryKey: STORE_KEY,
    queryFn: () => listStores(apiClient),
  });
}

export function useStoreAppearance(storeId: string | undefined): UseQueryResult<StoreAppearanceDTO> {
  return useQuery({
    queryKey: APPEARANCE_KEY(storeId ?? ''),
    queryFn: () => getStoreAppearance(apiClient, storeId as string),
    enabled: Boolean(storeId),
  });
}

export function useUpdateStoreAppearance(storeId: string | undefined): UseMutationResult<StoreAppearanceDTO, unknown, { changes: UpdateStoreAppearanceInput; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ changes, expectedVersion }) => updateStoreAppearance(apiClient, storeId as string, changes, expectedVersion),
    onSuccess: (data) => {
      queryClient.setQueryData(APPEARANCE_KEY(storeId ?? ''), data);
    },
  });
}

export function usePublishStoreAppearance(storeId: string | undefined): UseMutationResult<StoreAppearanceDTO, unknown, { expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ expectedVersion }) => publishStoreAppearance(apiClient, storeId as string, expectedVersion),
    onSuccess: (data) => {
      queryClient.setQueryData(APPEARANCE_KEY(storeId ?? ''), data);
    },
  });
}

export function useResetStoreAppearance(storeId: string | undefined): UseMutationResult<StoreAppearanceDTO, unknown, { expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ expectedVersion }) => resetStoreAppearance(apiClient, storeId as string, expectedVersion),
    onSuccess: (data) => {
      queryClient.setQueryData(APPEARANCE_KEY(storeId ?? ''), data);
    },
  });
}

/** Real Store identity/contact/address editing (`store_configuration.stores.manage`) — the same aggregate `WorkspaceSwitcher.tsx` reads, updated for the first time from Appearance's own Branding screen. */
export function useUpdateStore(): UseMutationResult<StoreDTO, unknown, { id: string; changes: UpdateStoreInput; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes, expectedVersion }) => updateStore(apiClient, id, changes, expectedVersion),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STORE_KEY });
    },
  });
}

/** A thin wrapper over the real, shared `uploadMedia` (`MODULE:MEDIA`) — no Appearance-specific upload endpoint exists, or should: logo/favicon are real Media Library assets like any other. */
export function useUploadBrandAsset(): UseMutationResult<MediaAssetDTO, unknown, { file: File; altText?: string }> {
  return useMutation({
    mutationFn: ({ file, altText }) => uploadMedia(apiClient, file, { altText }),
  });
}
