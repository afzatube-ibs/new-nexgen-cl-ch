import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { listPaymentAuditLogs, listUsers, type PaymentAuditLogDTO, type ListPaymentAuditLogsQuery, type UserDTO, type ListEnvelope } from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

/** `GET /payments/audit-logs` — Payments' own audit log. */
export function usePaymentAuditLogs(query: ListPaymentAuditLogsQuery): UseQueryResult<ListEnvelope<PaymentAuditLogDTO>> {
  return useQuery({ queryKey: ['payments-audit-logs', query], queryFn: () => listPaymentAuditLogs(apiClient, query) });
}

/** `GET /users` — Identity & Access's real staff directory, read-only, used only to resolve an audit entry's raw `actorId` to a display name. Mirrors every other module's own `useStaffDirectory()`. */
export function useStaffDirectory(): UseQueryResult<UserDTO[]> {
  return useQuery({ queryKey: ['staff-directory'], queryFn: () => listUsers(apiClient), retry: false, staleTime: 5 * 60 * 1000 });
}
