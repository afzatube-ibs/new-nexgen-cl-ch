import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import type { OrderAuditLogDTO, ListOrderAuditLogsQuery } from './types.js';

/**
 * `GET /orders/audit-logs` — `AuditLogController::index` (Orders' own,
 * apps/backend), `orders.audit_log.view`. Confirmed by reading it directly:
 * `actor_id`/`target_type` only, no `target_id` filter — the identical
 * constraint Customers' own audit endpoint has.
 */
export function listOrderAuditLogs(client: ApiClient, query?: ListOrderAuditLogsQuery): Promise<ListEnvelope<OrderAuditLogDTO>> {
  return client.get<ListEnvelope<OrderAuditLogDTO>>('/orders/audit-logs', {
    query: query && { actor_id: query.actorId, target_type: query.targetType, page: query.page, per_page: query.perPage },
  });
}
