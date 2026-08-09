import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  publishProduct,
  archiveProduct,
  destroyProduct,
  restoreProduct,
  type ProductDTO,
  type CreateProductInput,
  type UpdateProductInput,
  type ListProductsQuery,
} from '@nexgen/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createResourceHooks, apiClient } from '../shared/useResourceQueries.js';

const QUERY_KEY = 'catalog-products';

export const {
  useResourceList: useProducts,
  useCreateResource: useCreateProduct,
  useUpdateResource: useUpdateProduct,
  useArchiveResource: useArchiveProduct,
  useDestroyResource: useDestroyProduct,
  useRestoreResource: useRestoreProduct,
} = createResourceHooks<ProductDTO, CreateProductInput, UpdateProductInput, ListProductsQuery>(QUERY_KEY, {
  list: (query) => listProducts(apiClient, query),
  create: (input) => createProduct(apiClient, input),
  update: (id, input) => updateProduct(apiClient, id, input),
  archive: (id, expectedVersion) => archiveProduct(apiClient, id, expectedVersion),
  destroy: (id, expectedVersion) => destroyProduct(apiClient, id, expectedVersion),
  restore: (id) => restoreProduct(apiClient, id),
});

/** `GET /products/{product}` — used by `ProductFormPage` for a single record (the list query only carries what `index()` returns). */
export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => getProduct(apiClient, id!),
    enabled: Boolean(id),
  });
}

/** `POST /products/{product}/publish` — see `publishProduct`'s own docblock (api-client) for the completeness-check contract this surfaces, not re-derives. */
export function usePublishProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }: { id: string; expectedVersion: number }) => publishProduct(apiClient, id, expectedVersion),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
