import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import type { NotificationsAuditLogDTO, ListNotificationsAuditLogsQuery } from './types.js';

/** `GET /notification-audit-logs` — `AuditLogController::index` (Notifications' own), `notifications.audit_log.view`. A distinct path segment (not nested under `notifications/`) — mirrors `notification-templates`/`notification-providers`' own identical reasoning: would collide with `notifications/{notification}`'s wildcard binding. */
export function listNotificationsAuditLogs(client: ApiClient, query?: ListNotificationsAuditLogsQuery): Promise<ListEnvelope<NotificationsAuditLogDTO>> {
  return client.get<ListEnvelope<NotificationsAuditLogDTO>>('/notification-audit-logs', {
    query: query && { actor_id: query.actorId, target_type: query.targetType, page: query.page, per_page: query.perPage },
  });
}
