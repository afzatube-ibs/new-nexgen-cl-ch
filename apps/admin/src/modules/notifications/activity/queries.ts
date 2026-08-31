import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { listNotificationsAuditLogs, listUsers, type NotificationsAuditLogDTO, type ListNotificationsAuditLogsQuery, type UserDTO, type ListEnvelope } from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

/** `GET /notification-audit-logs` — Notifications' own audit log. */
export function useNotificationsAuditLogs(query: ListNotificationsAuditLogsQuery): UseQueryResult<ListEnvelope<NotificationsAuditLogDTO>> {
  return useQuery({ queryKey: ['notifications-audit-logs', query], queryFn: () => listNotificationsAuditLogs(apiClient, query) });
}

/** `GET /users` — Identity & Access's real staff directory, read-only, used only to resolve an audit entry's raw `actorId` to a display name. */
export function useStaffDirectory(): UseQueryResult<UserDTO[]> {
  return useQuery({ queryKey: ['staff-directory'], queryFn: () => listUsers(apiClient), retry: false, staleTime: 5 * 60 * 1000 });
}
