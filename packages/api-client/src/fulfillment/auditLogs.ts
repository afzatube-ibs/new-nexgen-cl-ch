import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import type { FulfillmentAuditLogDTO, ListFulfillmentAuditLogsQuery } from './types.js';

/** `GET /fulfillment/audit-logs` — `AuditLogController::index` (Fulfillment's own, apps/backend), `fulfillment.audit_log.view`. Confirmed by reading it directly: `actor_id`/`target_type`/`per_page` only, no `target_id` filter. */
export function listFulfillmentAuditLogs(client: ApiClient, query?: ListFulfillmentAuditLogsQuery): Promise<ListEnvelope<FulfillmentAuditLogDTO>> {
  return client.get<ListEnvelope<FulfillmentAuditLogDTO>>('/fulfillment/audit-logs', {
    query: query && { actor_id: query.actorId, target_type: query.targetType, page: query.page, per_page: query.perPage },
  });
}
