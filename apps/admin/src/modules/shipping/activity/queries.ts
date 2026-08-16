import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  listShippingAuditLogs,
  listFulfillmentAuditLogs,
  listUsers,
  type ShippingAuditLogDTO,
  type ListShippingAuditLogsQuery,
  type FulfillmentAuditLogDTO,
  type ListFulfillmentAuditLogsQuery,
  type UserDTO,
  type ListEnvelope,
} from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

/** `GET /shipping/audit-logs` — Shipping's own audit log (zones/methods/rates configuration changes). */
export function useShippingAuditLogs(query: ListShippingAuditLogsQuery): UseQueryResult<ListEnvelope<ShippingAuditLogDTO>> {
  return useQuery({ queryKey: ['shipping-audit-logs', query], queryFn: () => listShippingAuditLogs(apiClient, query) });
}

/** `GET /fulfillment/audit-logs` — Fulfillment's own audit log (shipment lifecycle changes) — the destination for Shipment Detail's own "Audit" link. */
export function useFulfillmentAuditLogs(query: ListFulfillmentAuditLogsQuery): UseQueryResult<ListEnvelope<FulfillmentAuditLogDTO>> {
  return useQuery({ queryKey: ['fulfillment-audit-logs', query], queryFn: () => listFulfillmentAuditLogs(apiClient, query) });
}

/** `GET /users` — Identity & Access's real staff directory, read-only, used only to resolve an audit entry's raw `actorId` to a display name. Mirrors every other module's own `useStaffDirectory()`. */
export function useStaffDirectory(): UseQueryResult<UserDTO[]> {
  return useQuery({ queryKey: ['staff-directory'], queryFn: () => listUsers(apiClient), retry: false, staleTime: 5 * 60 * 1000 });
}
