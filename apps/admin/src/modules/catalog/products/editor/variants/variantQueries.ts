import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listProductVariants,
  addProductVariant,
  updateProductVariant,
  archiveProductVariant,
  destroyProductVariant,
  syncProductOptions,
  type AddProductVariantInput,
  type UpdateProductVariantInput,
} from '@nexgen/api-client';
import { apiClient } from '../../../shared/useResourceQueries.js';

const PRODUCTS_KEY = 'catalog-products';

export function useProductVariants(productId: string | undefined) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, 'variants', productId],
    queryFn: () => listProductVariants(apiClient, productId!),
    enabled: Boolean(productId),
  });
}

function useInvalidateVariants(productId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY, 'variants', productId] });
    void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY, 'detail', productId] });
  };
}

export function useAddProductVariant(productId: string) {
  const invalidate = useInvalidateVariants(productId);
  return useMutation({
    mutationFn: (input: AddProductVariantInput) => addProductVariant(apiClient, productId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateProductVariant(productId: string) {
  const invalidate = useInvalidateVariants(productId);
  return useMutation({
    mutationFn: ({ variantId, input }: { variantId: string; input: UpdateProductVariantInput }) => updateProductVariant(apiClient, productId, variantId, input),
    onSuccess: invalidate,
  });
}

export function useArchiveProductVariant(productId: string) {
  const invalidate = useInvalidateVariants(productId);
  return useMutation({
    mutationFn: ({ variantId, expectedVersion }: { variantId: string; expectedVersion: number }) => archiveProductVariant(apiClient, productId, variantId, expectedVersion),
    onSuccess: invalidate,
  });
}

export function useDestroyProductVariant(productId: string) {
  const invalidate = useInvalidateVariants(productId);
  return useMutation({
    mutationFn: ({ variantId, expectedVersion }: { variantId: string; expectedVersion: number }) => destroyProductVariant(apiClient, productId, variantId, expectedVersion),
    onSuccess: invalidate,
  });
}

/** `PUT /products/{product}/options` — which Options define this product's variant dimensions (drives the Matrix below, not a display taxonomy — see `assignments.ts`). */
export function useSyncProductVariantOptions(productId: string) {
  const invalidate = useInvalidateVariants(productId);
  return useMutation({
    mutationFn: (optionIds: string[]) => syncProductOptions(apiClient, productId, optionIds),
    onSuccess: invalidate,
  });
}
