import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import type { PromotionsAuditLogDTO, ListPromotionsAuditLogsQuery } from './types.js';

/** `GET /promotions/audit-logs` — `AuditLogController::index` (Promotions' own, apps/backend), `promotions.audit_log.view`. Confirmed by reading it directly: `actor_id`/`target_type`/`per_page` only, no `target_id` filter. */
export function listPromotionsAuditLogs(client: ApiClient, query?: ListPromotionsAuditLogsQuery): Promise<ListEnvelope<PromotionsAuditLogDTO>> {
  return client.get<ListEnvelope<PromotionsAuditLogDTO>>('/promotions/audit-logs', {
    query: query && { actor_id: query.actorId, target_type: query.targetType, page: query.page, per_page: query.perPage },
  });
}
