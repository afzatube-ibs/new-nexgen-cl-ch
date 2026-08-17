import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import type { PaymentAuditLogDTO, ListPaymentAuditLogsQuery } from './types.js';

/** `GET /payments/audit-logs` — `AuditLogController::index` (Payments' own, apps/backend), `payments.audit_log.view`. Confirmed by reading it directly: `actor_id`/`target_type`/`per_page` only, no `target_id` filter. */
export function listPaymentAuditLogs(client: ApiClient, query?: ListPaymentAuditLogsQuery): Promise<ListEnvelope<PaymentAuditLogDTO>> {
  return client.get<ListEnvelope<PaymentAuditLogDTO>>('/payments/audit-logs', {
    query: query && { actor_id: query.actorId, target_type: query.targetType, page: query.page, per_page: query.perPage },
  });
}
