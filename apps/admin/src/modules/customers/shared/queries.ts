import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  archiveCustomer,
  destroyCustomer,
  exportCustomer,
  addCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  listCustomerAuditLogs,
  listOrders,
  listUsers,
  type CustomerDTO,
  type CustomerAddressDTO,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type ListCustomersQuery,
  type CreateCustomerAddressInput,
  type UpdateCustomerAddressInput,
  type ListCustomerAuditLogsQuery,
  type CustomerAuditLogDTO,
  type OrderDTO,
  type ListEnvelope,
  type UserDTO,
} from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

const QUERY_KEY = 'customers';

function useInvalidateList(): () => void {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] });
}

/**
 * Genuinely server-paginated — `CustomerController::index` supports real
 * `q`/`status`/`sort`/`direction`/`page`/`per_page`, confirmed by reading
 * the controller and its own Feature test directly. Unlike every Pricing
 * list this engagement built (whose backends had no `sort`/`search` at
 * all), this must NOT be fetched-then-filtered client-side — that would be
 * strictly worse than the real capability already sitting behind this one
 * query.
 */
export function useCustomers(query: ListCustomersQuery): UseQueryResult<ListEnvelope<CustomerDTO>> {
  return useQuery({ queryKey: [QUERY_KEY, 'list', query], queryFn: () => listCustomers(apiClient, query) });
}

/** `CustomerController::show` — the only query that returns `addresses`. */
export function useCustomer(id: string | undefined): UseQueryResult<CustomerDTO> {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => getCustomer(apiClient, id as string),
    enabled: Boolean(id),
  });
}

export function useCreateCustomer(): UseMutationResult<CustomerDTO, unknown, CreateCustomerInput> {
  const invalidateList = useInvalidateList();
  return useMutation({ mutationFn: (input: CreateCustomerInput) => createCustomer(apiClient, input), onSuccess: invalidateList });
}

export function useUpdateCustomer(): UseMutationResult<CustomerDTO, unknown, { id: string; input: UpdateCustomerInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => updateCustomer(apiClient, id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
    },
  });
}

export function useArchiveCustomer(): UseMutationResult<CustomerDTO, unknown, { id: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }) => archiveCustomer(apiClient, id, expectedVersion),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
    },
  });
}

export function useDestroyCustomer(): UseMutationResult<void, unknown, { id: string; expectedVersion: number }> {
  const invalidateList = useInvalidateList();
  return useMutation({ mutationFn: ({ id, expectedVersion }) => destroyCustomer(apiClient, id, expectedVersion), onSuccess: invalidateList });
}

/**
 * Address mutations invalidate their *parent* Customer's detail query
 * (`addresses` only ever arrives bundled there) and the list query, since
 * a mutated address bumps the customer aggregate's own `version`, which
 * the list's optimistic-lock-aware actions also depend on being fresh.
 */
export function useAddCustomerAddress(customerId: string): UseMutationResult<CustomerAddressDTO, unknown, CreateCustomerAddressInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomerAddressInput) => addCustomerAddress(apiClient, customerId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', customerId] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] });
    },
  });
}

export function useUpdateCustomerAddress(
  customerId: string,
): UseMutationResult<CustomerAddressDTO, unknown, { addressId: string; input: UpdateCustomerAddressInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ addressId, input }) => updateCustomerAddress(apiClient, customerId, addressId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', customerId] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] });
    },
  });
}

export function useDeleteCustomerAddress(customerId: string): UseMutationResult<void, unknown, { addressId: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ addressId, expectedVersion }) => deleteCustomerAddress(apiClient, customerId, addressId, expectedVersion),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', customerId] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] });
    },
  });
}

/**
 * `GET /customers/{id}/export` — a `useMutation`, not a `useQuery`: like
 * Pricing's own `useLookupPrice`, this is an explicit, on-demand staff
 * action ("export this record now"), not something that should reactively
 * refetch as the surrounding page re-renders. Every call is separately
 * audited server-side (`customer.exported`) — see `exportCustomer`'s own
 * docblock.
 */
export function useExportCustomer(): UseMutationResult<CustomerDTO, unknown, string> {
  return useMutation({ mutationFn: (id: string) => exportCustomer(apiClient, id) });
}

// ---------------------------------------------------------------------------
// Slice 2 — Orders integration. `GET /orders?customer_id=`, `orders.orders.
// view` — a real, already-existing capability on Orders' own backend
// (confirmed by reading `OrderController::index` directly), consumed here
// read-only. No Orders module is built — see `packages/api-client/src/
// orders/types.ts`'s own docblock.
// ---------------------------------------------------------------------------

const ORDERS_QUERY_KEY = 'customers-orders';

export function useCustomerOrders(customerId: string | undefined, page: number): UseQueryResult<ListEnvelope<OrderDTO>> {
  return useQuery({
    queryKey: [ORDERS_QUERY_KEY, customerId, page],
    queryFn: () => listOrders(apiClient, { customerId, page }),
    enabled: Boolean(customerId),
  });
}

// ---------------------------------------------------------------------------
// Slice 2 — Audit History. `GET /customers/audit-logs`, `customers.
// audit_log.view` — see `listCustomerAuditLogs`'s own docblock for the real
// `target_type`/`actor_id`-only filter constraint (no `target_id`).
// ---------------------------------------------------------------------------

const AUDIT_QUERY_KEY = 'customers-audit-logs';

export function useCustomerAuditLogs(query: ListCustomerAuditLogsQuery): UseQueryResult<ListEnvelope<CustomerAuditLogDTO>> {
  return useQuery({ queryKey: [AUDIT_QUERY_KEY, query], queryFn: () => listCustomerAuditLogs(apiClient, query) });
}

/**
 * `GET /users` — Identity & Access's real staff directory, read-only, used
 * only to resolve an audit entry's raw `actorId` to a display name. A
 * caller without `identity_access.users.view` gets a real 403 here — this
 * hook swallows that specific failure (`retry: false`, and every call site
 * falls back to showing the raw id) rather than surfacing a scary error for
 * what is, for this feature, a pure enrichment, not a hard requirement.
 *
 * `staleTime: 5 minutes` — found during this module's own Freeze Audit,
 * live-reproduced: every Customer Detail page visit (and the Audit Log
 * page) re-fetched the *entire* staff roster from scratch, since
 * `useQuery`'s own default `staleTime` is 0. A support team clicking
 * through many customer records in a day — exactly the daily-operations
 * scale this audit was asked to think about — means dozens of redundant
 * fetches of data that almost never changes within one shift. Matches the
 * same reasoning `useCatalogProductBySku`'s own `staleTime` already
 * established for a different small, rarely-changing lookup.
 */
export function useStaffDirectory(): UseQueryResult<UserDTO[]> {
  return useQuery({ queryKey: ['staff-directory'], queryFn: () => listUsers(apiClient), retry: false, staleTime: 5 * 60 * 1000 });
}
