import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { listInventoryAuditLogs, type InventoryAuditLogDTO, type ListEnvelope } from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

/**
 * `GET /inventory/audit-logs` — a real, global, paginated feed (see
 * `packages/api-client/src/inventory/auditLogs.ts`'s own docblock for why
 * this needs no client-side `targetId` filter pass the way Catalog's
 * per-product Activity card does).
 */
export function useInventoryActivity(targetType: string | undefined, page: number): UseQueryResult<ListEnvelope<InventoryAuditLogDTO>> {
  return useQuery({
    queryKey: ['inventory-audit-logs', 'list', targetType, page],
    queryFn: () => listInventoryAuditLogs(apiClient, { targetType, page }),
  });
}
