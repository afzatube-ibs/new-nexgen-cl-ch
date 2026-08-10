import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listMedia,
  uploadMedia,
  listProductImages,
  addProductImage,
  updateProductImage,
  destroyProductImage,
  type ListMediaQuery,
  type AddProductImageInput,
  type UpdateProductImageInput,
} from '@nexgen/api-client';
import { apiClient } from '../../../shared/useResourceQueries.js';

const PRODUCTS_KEY = 'catalog-products';
const MEDIA_KEY = 'media-library';

/** The shared Media Library (`MODULE:MEDIA`) — every asset ever uploaded, independent of which product (if any) currently attaches it. */
export function useMediaLibrary(query?: ListMediaQuery) {
  return useQuery({
    queryKey: [MEDIA_KEY, 'list', query],
    queryFn: () => listMedia(apiClient, query),
  });
}

/** Upload takes `onProgress` at call time (not hook-creation time) since each concurrent upload in `MediaLibraryDialog`'s own drop zone needs its own progress callback — a single hook-level callback couldn't distinguish between them. */
export function useUploadMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, altText, onProgress }: { file: File; altText?: string; onProgress?: (percent: number) => void }) =>
      uploadMedia(apiClient, file, { altText, onProgress }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [MEDIA_KEY] }),
  });
}

/** This product's own attached images (`ProductImage`, ordered by `position`) — a narrower, always-fresh view than trusting `ProductDTO.images` off the cached detail query, since every mutation below only needs to invalidate this one list plus the product detail (for the completion checklist / publish gate), not the whole product-detail cache shape. */
export function useProductImages(productId: string | undefined) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, 'images', productId],
    queryFn: () => listProductImages(apiClient, productId!),
    enabled: Boolean(productId),
  });
}

function useInvalidateProductImages(productId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY, 'images', productId] });
    // Full detail refetch — `ProductResource`'s `images` field only reflects
    // what was loaded at the time of that particular response (see
    // `assignments.ts`'s own docblock for the same reasoning applied to
    // sync endpoints); simplest to just treat the cached detail as stale.
    void queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY, 'detail', productId] });
  };
}

export function useAddProductImage(productId: string) {
  const invalidate = useInvalidateProductImages(productId);
  return useMutation({
    mutationFn: (input: AddProductImageInput) => addProductImage(apiClient, productId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateProductImage(productId: string) {
  const invalidate = useInvalidateProductImages(productId);
  return useMutation({
    mutationFn: ({ imageId, input }: { imageId: string; input: UpdateProductImageInput }) => updateProductImage(apiClient, productId, imageId, input),
    onSuccess: invalidate,
  });
}

export function useRemoveProductImage(productId: string) {
  const invalidate = useInvalidateProductImages(productId);
  return useMutation({
    mutationFn: (imageId: string) => destroyProductImage(apiClient, productId, imageId),
    onSuccess: invalidate,
  });
}
