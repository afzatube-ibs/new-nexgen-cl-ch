import {
  listBrands,
  getBrand,
  createBrand,
  updateBrand,
  archiveBrand,
  destroyBrand,
  restoreBrand,
  type BrandDTO,
  type CreateBrandInput,
  type UpdateBrandInput,
  type ListQuery,
} from '@nexgen/api-client';
import { createResourceHooks, apiClient } from '../shared/useResourceQueries.js';

export const {
  useResourceList: useBrands,
  useResourceListAll: useAllBrands,
  useCreateResource: useCreateBrand,
  useUpdateResource: useUpdateBrand,
  useArchiveResource: useArchiveBrand,
  useDestroyResource: useDestroyBrand,
  useRestoreResource: useRestoreBrand,
} =
  createResourceHooks<BrandDTO, CreateBrandInput, UpdateBrandInput, ListQuery>('catalog-brands', {
    list: (query) => listBrands(apiClient, query),
    create: (input) => createBrand(apiClient, input),
    update: (id, input) => updateBrand(apiClient, id, input),
    archive: (id, expectedVersion) => archiveBrand(apiClient, id, expectedVersion),
    destroy: (id, expectedVersion) => destroyBrand(apiClient, id, expectedVersion),
    restore: (id) => restoreBrand(apiClient, id),
  });

export { getBrand };
