import {
  listTags,
  createTag,
  updateTag,
  destroyTag,
  restoreTag,
  type TagDTO,
  type CreateTagInput,
  type UpdateTagInput,
  type ListQuery,
} from '@nexgen/api-client';
import { createResourceHooks, apiClient } from '../shared/useResourceQueries.js';

export const {
  useResourceList: useTags,
  useResourceListAll: useAllTags,
  useCreateResource: useCreateTag,
  useUpdateResource: useUpdateTag,
  useDestroyResource: useDestroyTag,
  useRestoreResource: useRestoreTag,
} = createResourceHooks<TagDTO, CreateTagInput, UpdateTagInput, ListQuery>('catalog-tags', {
  list: (query) => listTags(apiClient, query),
  create: (input) => createTag(apiClient, input),
  update: (id, input) => updateTag(apiClient, id, input),
  destroy: (id, expectedVersion) => destroyTag(apiClient, id, expectedVersion),
  restore: (id) => restoreTag(apiClient, id),
});
