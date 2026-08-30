import type { ApiClient } from '../client.js';
import type { DataEnvelope } from '../types.js';
import type { OrderMetricsSummaryDTO, TopSellingProductDTO, ListTopSellingProductsQuery } from './types.js';

/**
 * `apps/backend/.../Orders/routes.php` — `orders/metrics`/`orders/top-
 * products`, both `orders.orders.view`. See `OrderMetricsController`'s own
 * docblock for why these are a small, additive read endpoint rather than
 * a client-side paginated sum over `listOrders()`.
 */
export function getOrderMetrics(client: ApiClient): Promise<OrderMetricsSummaryDTO> {
  return client.get<DataEnvelope<OrderMetricsSummaryDTO>>('/orders/metrics').then((r) => r.data);
}

export function getTopSellingProducts(client: ApiClient, query?: ListTopSellingProductsQuery): Promise<TopSellingProductDTO[]> {
  return client
    .get<DataEnvelope<TopSellingProductDTO[]>>('/orders/top-products', { query: query && { limit: query.limit } })
    .then((r) => r.data);
}
