import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import type { InventoryAuditLogDTO, ListInventoryAuditLogsQuery } from './types.js';

/** `GET /inventory/audit-logs` — `AuditLogController::index` supports a `target_type` filter only (no `actor_id`, no `target_id`) — a real, global, paginated cross-item feed, which is exactly what the Inventory Activity / Movement History screen needs (contrast with Catalog's own per-product Activity card, which has to filter by `target_id` client-side because its feed is scoped to one record). */
export function listInventoryAuditLogs(client: ApiClient, query?: ListInventoryAuditLogsQuery): Promise<ListEnvelope<InventoryAuditLogDTO>> {
  return client.get<ListEnvelope<InventoryAuditLogDTO>>('/inventory/audit-logs', {
    query: query && { target_type: query.targetType, page: query.page, per_page: query.perPage },
  });
}
