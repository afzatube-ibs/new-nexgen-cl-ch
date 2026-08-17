import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { listPromotionsAuditLogs, listUsers, type PromotionsAuditLogDTO, type ListPromotionsAuditLogsQuery, type UserDTO, type ListEnvelope } from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

/** `GET /promotions/audit-logs` — Promotions' own audit log. */
export function usePromotionsAuditLogs(query: ListPromotionsAuditLogsQuery): UseQueryResult<ListEnvelope<PromotionsAuditLogDTO>> {
  return useQuery({ queryKey: ['promotions-audit-logs', query], queryFn: () => listPromotionsAuditLogs(apiClient, query) });
}

/** `GET /users` — Identity & Access's real staff directory, read-only, used only to resolve an audit entry's raw `actorId` to a display name. Mirrors every other module's own `useStaffDirectory()`. */
export function useStaffDirectory(): UseQueryResult<UserDTO[]> {
  return useQuery({ queryKey: ['staff-directory'], queryFn: () => listUsers(apiClient), retry: false, staleTime: 5 * 60 * 1000 });
}
