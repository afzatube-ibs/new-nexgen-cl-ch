import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import type { ShippingAuditLogDTO, ListShippingAuditLogsQuery } from './types.js';

/** `GET /shipping/audit-logs` — `AuditLogController::index` (Shipping's own, apps/backend), `shipping.audit_log.view`. Confirmed by reading it directly: `actor_id`/`target_type`/`per_page` only, no `target_id` filter. */
export function listShippingAuditLogs(client: ApiClient, query?: ListShippingAuditLogsQuery): Promise<ListEnvelope<ShippingAuditLogDTO>> {
  return client.get<ListEnvelope<ShippingAuditLogDTO>>('/shipping/audit-logs', {
    query: query && { actor_id: query.actorId, target_type: query.targetType, page: query.page, per_page: query.perPage },
  });
}
