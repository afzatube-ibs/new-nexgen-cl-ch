import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import type { CatalogAuditLogDTO, ListCatalogAuditLogsQuery } from './types.js';

/** `GET /catalog/audit-logs` — `AuditLogController::index` supports `actor_id`/`target_type` filters only (no `target_id`) — see `CATALOG_PRODUCT_TARGET_TYPE`'s own docblock in `types.ts` for how the product Activity card works around that gap. */
export function listCatalogAuditLogs(client: ApiClient, query?: ListCatalogAuditLogsQuery): Promise<ListEnvelope<CatalogAuditLogDTO>> {
  return client.get<ListEnvelope<CatalogAuditLogDTO>>('/catalog/audit-logs', {
    query: query && {
      actor_id: query.actorId,
      target_type: query.targetType,
      page: query.page,
      per_page: query.perPage,
    },
  });
}
