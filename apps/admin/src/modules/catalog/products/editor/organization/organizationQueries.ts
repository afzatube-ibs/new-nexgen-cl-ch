import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  syncProductCategories,
  syncProductCollections,
  syncProductTags,
  listProductRelationships,
  addProductRelationship,
  removeProductRelationship,
  type AddProductRelationshipInput,
} from '@nexgen/api-client';
import { apiClient } from '../../../shared/useResourceQueries.js';

const PRODUCTS_KEY = 'catalog-products';

function useInvalidateProductDetail(productId: string) {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY, 'detail', productId] });
}

export function useSyncProductCategories(productId: string) {
  const invalidate = useInvalidateProductDetail(productId);
  return useMutation({ mutationFn: (categoryIds: string[]) => syncProductCategories(apiClient, productId, categoryIds), onSuccess: invalidate });
}

export function useSyncProductCollections(productId: string) {
  const invalidate = useInvalidateProductDetail(productId);
  return useMutation({ mutationFn: (collectionIds: string[]) => syncProductCollections(apiClient, productId, collectionIds), onSuccess: invalidate });
}

export function useSyncProductTags(productId: string) {
  const invalidate = useInvalidateProductDetail(productId);
  return useMutation({ mutationFn: (tagIds: string[]) => syncProductTags(apiClient, productId, tagIds), onSuccess: invalidate });
}

export function useProductRelationships(productId: string | undefined) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, 'relationships', productId],
    queryFn: () => listProductRelationships(apiClient, productId!),
    enabled: Boolean(productId),
  });
}

function useInvalidateRelationships(productId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY, 'relationships', productId] });
    void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY, 'detail', productId] });
  };
}

export function useAddProductRelationship(productId: string) {
  const invalidate = useInvalidateRelationships(productId);
  return useMutation({
    mutationFn: (input: AddProductRelationshipInput) => addProductRelationship(apiClient, productId, input),
    onSuccess: invalidate,
  });
}

export function useRemoveProductRelationship(productId: string) {
  const invalidate = useInvalidateRelationships(productId);
  return useMutation({
    mutationFn: (relationshipId: string) => removeProductRelationship(apiClient, productId, relationshipId),
    onSuccess: invalidate,
  });
}
