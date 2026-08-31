import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { listReviewsAuditLogs, listUsers, type ReviewsAuditLogDTO, type ListReviewsAuditLogsQuery, type UserDTO, type ListEnvelope } from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

/** `GET /reviews/audit-logs` — Reviews' own audit log (review lifecycle changes). */
export function useReviewsAuditLogs(query: ListReviewsAuditLogsQuery): UseQueryResult<ListEnvelope<ReviewsAuditLogDTO>> {
  return useQuery({ queryKey: ['reviews-audit-logs', query], queryFn: () => listReviewsAuditLogs(apiClient, query) });
}

/** `GET /users` — Identity & Access's real staff directory, read-only, used only to resolve an audit entry's raw `actorId` to a display name. Mirrors every other module's own `useStaffDirectory()`. */
export function useStaffDirectory(): UseQueryResult<UserDTO[]> {
  return useQuery({ queryKey: ['staff-directory'], queryFn: () => listUsers(apiClient), retry: false, staleTime: 5 * 60 * 1000 });
}
