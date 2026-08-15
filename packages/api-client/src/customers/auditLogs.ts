import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import type { CustomerAuditLogDTO, ListCustomerAuditLogsQuery } from './types.js';

/**
 * `GET /customers/audit-logs` — `AuditLogController::index` (Customers'
 * own, apps/backend), `customers.audit_log.view`. The exact fully-
 * qualified class strings `target_type` filters against — confirmed by
 * reading `AuditLog::where('target_type', ...)` and this module's own
 * Actions directly, every one of which passes `Customer::class`/
 * `CustomerAddress::class` verbatim.
 */
export const CUSTOMER_TARGET_TYPE = 'App\\Domains\\Commerce\\Customers\\Models\\Customer';
export const CUSTOMER_ADDRESS_TARGET_TYPE = 'App\\Domains\\Commerce\\Customers\\Models\\CustomerAddress';

export function listCustomerAuditLogs(client: ApiClient, query?: ListCustomerAuditLogsQuery): Promise<ListEnvelope<CustomerAuditLogDTO>> {
  return client.get<ListEnvelope<CustomerAuditLogDTO>>('/customers/audit-logs', {
    query: query && { actor_id: query.actorId, target_type: query.targetType, page: query.page, per_page: query.perPage },
  });
}
