import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCmsPage,
  listCmsPageRevisions,
  listCmsPages,
  listStores,
  publishCmsPage,
  restoreCmsPageRevision,
  unpublishCmsPage,
  updateCmsPage,
  type SaveCmsPageInput,
} from '@nexgen/api-client';
import { apiClient } from '../../lib/apiClient.js';

const STORE_KEY = ['stores'];
const PAGES_KEY = (storeId: string) => ['cms', 'pages', storeId];
const REVISIONS_KEY = (storeId: string, pageId: string) => ['cms', 'revisions', storeId, pageId];

export function useCurrentStore() {
  return useQuery({ queryKey: STORE_KEY, queryFn: () => listStores(apiClient) });
}

export function useCmsPages(storeId: string | undefined) {
  return useQuery({
    queryKey: PAGES_KEY(storeId ?? ''),
    queryFn: () => listCmsPages(apiClient, storeId as string),
    enabled: Boolean(storeId),
  });
}

export function useCmsPageRevisions(storeId: string | undefined, pageId: string | undefined) {
  return useQuery({
    queryKey: REVISIONS_KEY(storeId ?? '', pageId ?? ''),
    queryFn: () => listCmsPageRevisions(apiClient, storeId as string, pageId as string),
    enabled: Boolean(storeId && pageId),
  });
}

export function useCreateCmsPage(storeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveCmsPageInput) => createCmsPage(apiClient, storeId as string, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: PAGES_KEY(storeId ?? '') }),
  });
}

export function useUpdateCmsPage(storeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, input, expectedVersion }: { pageId: string; input: Partial<SaveCmsPageInput>; expectedVersion: number }) =>
      updateCmsPage(apiClient, storeId as string, pageId, input, expectedVersion),
    onSuccess: (page) => {
      queryClient.setQueryData(PAGES_KEY(storeId ?? ''), (old: unknown) =>
        Array.isArray(old) ? old.map((item) => (typeof item === 'object' && item && 'id' in item && item.id === page.id ? page : item)) : old,
      );
      void queryClient.invalidateQueries({ queryKey: REVISIONS_KEY(storeId ?? '', page.id) });
    },
  });
}

export function usePublishCmsPage(storeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, expectedVersion }: { pageId: string; expectedVersion: number }) => publishCmsPage(apiClient, storeId as string, pageId, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: PAGES_KEY(storeId ?? '') }),
  });
}

export function useUnpublishCmsPage(storeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, expectedVersion }: { pageId: string; expectedVersion: number }) => unpublishCmsPage(apiClient, storeId as string, pageId, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: PAGES_KEY(storeId ?? '') }),
  });
}

export function useRestoreCmsRevision(storeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, revisionId, expectedVersion }: { pageId: string; revisionId: string; expectedVersion: number }) =>
      restoreCmsPageRevision(apiClient, storeId as string, pageId, revisionId, expectedVersion),
    onSuccess: (page) => {
      void queryClient.invalidateQueries({ queryKey: PAGES_KEY(storeId ?? '') });
      void queryClient.invalidateQueries({ queryKey: REVISIONS_KEY(storeId ?? '', page.id) });
    },
  });
}
