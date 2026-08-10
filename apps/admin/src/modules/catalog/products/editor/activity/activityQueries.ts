import { useInfiniteQuery } from '@tanstack/react-query';
import { listCatalogAuditLogs, CATALOG_PRODUCT_TARGET_TYPE } from '@nexgen/api-client';
import { apiClient } from '../../../shared/useResourceQueries.js';

const PER_PAGE = 50;

/**
 * `AuditLogController::index` (apps/backend) filters by `actor_id`/
 * `target_type` only — there is no `target_id` filter. Every Product-aggregate
 * mutation (the product itself, its variants, images, relationships,
 * category/collection/tag/option sync, attribute values) is logged with
 * `targetType: Product::class` and `targetId: product->id` (confirmed by
 * reading every relevant Action), so filtering by `target_type` server-side
 * and then by `targetId` client-side, page by page, is correct — just not
 * as efficient as a real `target_id` filter would be. `useInfiniteQuery`'s
 * own pagination maps directly onto "Load more", so a product with a long
 * history doesn't require fetching the entire cross-product log at once.
 */
export function useProductActivity(productId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['catalog-products', 'activity', productId],
    queryFn: ({ pageParam }) => listCatalogAuditLogs(apiClient, { targetType: CATALOG_PRODUCT_TARGET_TYPE, page: pageParam, perPage: PER_PAGE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const current = lastPage.meta?.current_page ?? 1;
      const last = lastPage.meta?.last_page ?? current;
      return current < last ? current + 1 : undefined;
    },
    enabled: Boolean(productId),
  });
}
