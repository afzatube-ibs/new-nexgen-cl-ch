import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCmsMenu,
  createCmsPage,
  listCmsMenus,
  listCmsPageRevisions,
  listCmsPages,
  listStores,
  publishCmsMenu,
  publishCmsPage,
  restoreCmsPageRevision,
  unpublishCmsMenu,
  unpublishCmsPage,
  updateCmsMenu,
  updateCmsPage,
  type SaveCmsMenuInput,
  type SaveCmsPageInput,
} from '@nexgen/api-client';
import { apiClient } from '../../lib/apiClient.js';

const STORE_KEY = ['stores'];
const PAGES_KEY = (storeId: string) => ['cms', 'pages', storeId];
const REVISIONS_KEY = (storeId: string, pageId: string) => ['cms', 'revisions', storeId, pageId];
const MENUS_KEY = (storeId: string) => ['cms', 'menus', storeId];

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

export function useCmsMenus(storeId: string | undefined) {
  return useQuery({
    queryKey: MENUS_KEY(storeId ?? ''),
    queryFn: () => listCmsMenus(apiClient, storeId as string),
    enabled: Boolean(storeId),
  });
}

export function useCreateCmsMenu(storeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveCmsMenuInput) => createCmsMenu(apiClient, storeId as string, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: MENUS_KEY(storeId ?? '') }),
  });
}

export function useUpdateCmsMenu(storeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ menuId, input, expectedVersion }: { menuId: string; input: Partial<SaveCmsMenuInput>; expectedVersion: number }) =>
      updateCmsMenu(apiClient, storeId as string, menuId, input, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: MENUS_KEY(storeId ?? '') }),
  });
}

export function usePublishCmsMenu(storeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ menuId, expectedVersion }: { menuId: string; expectedVersion: number }) => publishCmsMenu(apiClient, storeId as string, menuId, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: MENUS_KEY(storeId ?? '') }),
  });
}

export function useUnpublishCmsMenu(storeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ menuId, expectedVersion }: { menuId: string; expectedVersion: number }) => unpublishCmsMenu(apiClient, storeId as string, menuId, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: MENUS_KEY(storeId ?? '') }),
  });
}
