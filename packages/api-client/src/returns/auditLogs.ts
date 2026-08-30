import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import type { ReturnsAuditLogDTO, ListReturnsAuditLogsQuery } from './types.js';

/** `GET /returns/audit-logs` — `AuditLogController::index` (Returns' own), `returns.audit_log.view`. Mirrors Fulfillment's own audit-log query shape exactly: `actor_id`/`target_type`/`per_page` only, no `target_id` filter. */
export function listReturnsAuditLogs(client: ApiClient, query?: ListReturnsAuditLogsQuery): Promise<ListEnvelope<ReturnsAuditLogDTO>> {
  return client.get<ListEnvelope<ReturnsAuditLogDTO>>('/returns/audit-logs', {
    query: query && { actor_id: query.actorId, target_type: query.targetType, page: query.page, per_page: query.perPage },
  });
}
