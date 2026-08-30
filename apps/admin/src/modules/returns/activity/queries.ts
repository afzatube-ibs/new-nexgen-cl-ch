import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { listReturnsAuditLogs, listUsers, type ReturnsAuditLogDTO, type ListReturnsAuditLogsQuery, type UserDTO, type ListEnvelope } from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

/** `GET /returns/audit-logs` — Returns' own audit log (return-request lifecycle changes). */
export function useReturnsAuditLogs(query: ListReturnsAuditLogsQuery): UseQueryResult<ListEnvelope<ReturnsAuditLogDTO>> {
  return useQuery({ queryKey: ['returns-audit-logs', query], queryFn: () => listReturnsAuditLogs(apiClient, query) });
}

/** `GET /users` — Identity & Access's real staff directory, read-only, used only to resolve an audit entry's raw `actorId` to a display name. Mirrors every other module's own `useStaffDirectory()`. */
export function useStaffDirectory(): UseQueryResult<UserDTO[]> {
  return useQuery({ queryKey: ['staff-directory'], queryFn: () => listUsers(apiClient), retry: false, staleTime: 5 * 60 * 1000 });
}
