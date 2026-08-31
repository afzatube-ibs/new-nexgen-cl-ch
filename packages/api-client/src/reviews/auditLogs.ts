import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import type { ReviewsAuditLogDTO, ListReviewsAuditLogsQuery } from './types.js';

/** `GET /reviews/audit-logs` — `AuditLogController::index` (Reviews' own), `reviews.audit_log.view`. `actor_id`/`target_type`/`per_page` only, no `target_id` filter. */
export function listReviewsAuditLogs(client: ApiClient, query?: ListReviewsAuditLogsQuery): Promise<ListEnvelope<ReviewsAuditLogDTO>> {
  return client.get<ListEnvelope<ReviewsAuditLogDTO>>('/reviews/audit-logs', {
    query: query && { actor_id: query.actorId, target_type: query.targetType, page: query.page, per_page: query.perPage },
  });
}
