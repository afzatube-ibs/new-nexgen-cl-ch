import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getOrderMetrics, getTopSellingProducts, listOrders, listOrderAuditLogs, type OrderMetricsSummaryDTO, type TopSellingProductDTO, type OrderDTO, type OrderAuditLogDTO, type ListEnvelope } from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

/**
 * Production Completion Plan v2, Milestone 8 (Dashboard Real Widgets) —
 * every Orders-owned dashboard widget's own data source. `useOrderMetrics`
 * backs four separate cards (Pending Orders, Today's Orders, Today's
 * Revenue, This Month Revenue) that all read the same real endpoint —
 * React Query's own cache key dedupes this to one real network call no
 * matter how many of the four widgets are mounted at once, so this is not
 * four requests in practice.
 */
export function useOrderMetrics(): UseQueryResult<OrderMetricsSummaryDTO> {
  return useQuery({ queryKey: ['orders-metrics'], queryFn: () => getOrderMetrics(apiClient), staleTime: 60 * 1000 });
}

export function useTopSellingProducts(limit = 5): UseQueryResult<TopSellingProductDTO[]> {
  return useQuery({ queryKey: ['orders-top-products', limit], queryFn: () => getTopSellingProducts(apiClient, { limit }), staleTime: 60 * 1000 });
}

/** The real "Recent Orders" widget — the same `listOrders()` every OrdersListPage call uses, already sorted newest-first by the backend; this just reads page 1 and shows the first few rows. */
export function useRecentOrders(): UseQueryResult<ListEnvelope<OrderDTO>> {
  return useQuery({ queryKey: ['orders-recent'], queryFn: () => listOrders(apiClient), staleTime: 60 * 1000 });
}

/**
 * The real "Recent Activity" widget — Orders' own audit log
 * (`AuditLogController::index`, already real and complete), the platform's
 * own most central activity stream. Named "Recent Activity," not "Platform
 * Activity": no unified cross-domain activity feed exists on the real
 * backend (every module owns its own separate audit log), so this is
 * honestly scoped to what it actually shows.
 */
export function useRecentOrderActivity(): UseQueryResult<ListEnvelope<OrderAuditLogDTO>> {
  return useQuery({ queryKey: ['orders-recent-activity'], queryFn: () => listOrderAuditLogs(apiClient, { perPage: 5 }), staleTime: 60 * 1000 });
}
