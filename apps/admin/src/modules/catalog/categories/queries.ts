import {
  listCategories,
  createCategory,
  updateCategory,
  archiveCategory,
  destroyCategory,
  restoreCategory,
  type CategoryDTO,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type ListQuery,
} from '@nexgen/api-client';
import { createResourceHooks, apiClient } from '../shared/useResourceQueries.js';

export const {
  useResourceList: useCategories,
  useResourceListAll: useAllCategories,
  useCreateResource: useCreateCategory,
  useUpdateResource: useUpdateCategory,
  useArchiveResource: useArchiveCategory,
  useDestroyResource: useDestroyCategory,
  useRestoreResource: useRestoreCategory,
} = createResourceHooks<CategoryDTO, CreateCategoryInput, UpdateCategoryInput, ListQuery>('catalog-categories', {
  list: (query) => listCategories(apiClient, query),
  create: (input) => createCategory(apiClient, input),
  update: (id, input) => updateCategory(apiClient, id, input),
  archive: (id, expectedVersion) => archiveCategory(apiClient, id, expectedVersion),
  destroy: (id, expectedVersion) => destroyCategory(apiClient, id, expectedVersion),
  restore: (id) => restoreCategory(apiClient, id),
});
