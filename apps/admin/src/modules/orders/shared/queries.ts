import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import {
  listOrders,
  getOrder,
  confirmOrder,
  startProcessingOrder,
  shipOrder,
  deliverOrder,
  cancelOrder,
  addOrderNote,
  listOrderAuditLogs,
  listUsers,
  listShipments,
  listPayments,
  listNotifications,
  getCustomer,
  ORDER_RELATED_TYPE,
  PAYMENT_RELATED_TYPE,
  SHIPMENT_RELATED_TYPE,
  type OrderDTO,
  type OrderNoteDTO,
  type ListOrdersQuery,
  type TransitionOrderInput,
  type CancelOrderInput,
  type AddOrderNoteInput,
  type ListOrderAuditLogsQuery,
  type OrderAuditLogDTO,
  type ListEnvelope,
  type UserDTO,
  type ShipmentDTO,
  type PaymentDTO,
  type NotificationDTO,
} from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';
import { mergeNotifications } from './mergeNotifications.js';

const QUERY_KEY = 'orders';

function useInvalidateOrder(id: string): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] });
    void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
  };
}

/**
 * `OrderController::index` — genuinely server-side `status`/`customer_id`/
 * `q`, hardcoded `orderByDesc('placed_at')` (no sortable columns to offer —
 * confirmed by reading the controller directly), Laravel's own default
 * pagination (no `per_page` override to read).
 */
export function useOrders(query: ListOrdersQuery): UseQueryResult<ListEnvelope<OrderDTO>> {
  return useQuery({ queryKey: [QUERY_KEY, 'list', query], queryFn: () => listOrders(apiClient, query) });
}

/** `OrderController::show` — the only query that returns items/addresses/discounts/notes/timelineEvents. */
export function useOrder(id: string | undefined): UseQueryResult<OrderDTO> {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => getOrder(apiClient, id as string),
    enabled: Boolean(id),
  });
}

function useTransitionMutation(
  fn: (id: string, input: TransitionOrderInput) => Promise<OrderDTO>,
): UseMutationResult<OrderDTO, unknown, { id: string; input: TransitionOrderInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => fn(id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
    },
  });
}

/**
 * One hook per real backend transition (`OrderStatusController`) — mirrors
 * the backend's own design of five dedicated business actions rather than
 * a single generic "update status" mutation, so an illegal call is never
 * even representable in the UI's own types.
 */
export function useConfirmOrder() {
  return useTransitionMutation((id, input) => confirmOrder(apiClient, id, input));
}
export function useStartProcessingOrder() {
  return useTransitionMutation((id, input) => startProcessingOrder(apiClient, id, input));
}
export function useShipOrder() {
  return useTransitionMutation((id, input) => shipOrder(apiClient, id, input));
}
export function useDeliverOrder() {
  return useTransitionMutation((id, input) => deliverOrder(apiClient, id, input));
}

export function useCancelOrder(): UseMutationResult<OrderDTO, unknown, { id: string; input: CancelOrderInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => cancelOrder(apiClient, id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
    },
  });
}

/**
 * `OrderNoteController::store` — append-only, `orders.notes.manage`.
 * Bumps the parent Order's own `lock_version` (`touchAggregateVersion()`,
 * confirmed by reading `AddOrderNoteAction` directly), so both the note
 * itself and the parent Order detail (whose `version` the next transition
 * call depends on) must be invalidated together.
 */
export function useAddOrderNote(orderId: string): UseMutationResult<OrderNoteDTO, unknown, AddOrderNoteInput> {
  const invalidate = useInvalidateOrder(orderId);
  return useMutation({
    mutationFn: (input: AddOrderNoteInput) => addOrderNote(apiClient, orderId, input),
    onSuccess: invalidate,
  });
}

const AUDIT_QUERY_KEY = 'orders-audit-logs';

/** `GET /orders/audit-logs` — see `listOrderAuditLogs`'s own docblock for the real `target_type`/`actor_id`-only filter constraint (no `target_id`). */
export function useOrderAuditLogs(query: ListOrderAuditLogsQuery): UseQueryResult<ListEnvelope<OrderAuditLogDTO>> {
  return useQuery({ queryKey: [AUDIT_QUERY_KEY, query], queryFn: () => listOrderAuditLogs(apiClient, query) });
}

/**
 * `GET /users` — Identity & Access's real staff directory, read-only, used
 * only to resolve an audit entry's raw `actorId` to a display name. Mirrors
 * Customers' own `useStaffDirectory()` exactly, including its `staleTime`
 * (a redundant-refetch issue that module's own Freeze Audit found and
 * fixed) — applied here from the start rather than repeating that finding.
 */
export function useStaffDirectory(): UseQueryResult<UserDTO[]> {
  return useQuery({ queryKey: ['staff-directory'], queryFn: () => listUsers(apiClient), retry: false, staleTime: 5 * 60 * 1000 });
}

/**
 * `GET /customers/{id}` — Customers' own real endpoint, read-only, used
 * only to resolve a `customer_id` deep-link filter's raw id to a display
 * name for the Orders List's own filter chip. Found during this module's
 * own Freeze Audit: `CustomerRecentOrdersCard`'s "View all" link passes the
 * customer's name via router state, but that state is lost on a full page
 * reload or a bookmarked/shared URL — the chip fell back to showing the raw
 * UUID, which is honest but not merchant-readable. `retry: false` and a
 * silently-swallowed failure (never surfaced as an error toast) mean a
 * caller without `customers.customers.view`, or a since-deleted customer
 * (`customer_id` is identifier-only, never a live foreign key), degrades to
 * exactly the same raw-id display this already had — never worse.
 */
export function useCustomerName(customerId: string | undefined): UseQueryResult<string> {
  return useQuery({
    queryKey: ['orders-customer-name', customerId],
    queryFn: () => getCustomer(apiClient, customerId as string).then((c) => c.name),
    enabled: Boolean(customerId),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Slice 2 — Order Operations & Merchant Workflow. Three real, existing
// cross-domain relationships surfaced read-only on Order Detail — each
// gated by that OTHER module's own real permission, `retry: false` so a
// caller without it degrades to an honestly-hidden card (via
// RequirePermission) rather than a scary error, matching `useStaffDirectory`'s
// own established precedent for a non-Orders permission this module reads
// across.
// ---------------------------------------------------------------------------

const SHIPMENTS_QUERY_KEY = 'orders-shipments';

/** `GET /shipments?order_id=` — `ShipmentController::index` (Fulfillment's own), confirmed server-side filterable by reading it directly. A Shipment is created automatically once per real Order via `CreateShipmentOnOrderPlaced`; a failed/cancelled one is re-fulfilled by a NEW Shipment row (never resurrected — confirmed via `Shipment`'s own docblock), so this can genuinely return more than one row per order. */
export function useOrderShipments(orderId: string | undefined): UseQueryResult<ListEnvelope<ShipmentDTO>> {
  return useQuery({
    queryKey: [SHIPMENTS_QUERY_KEY, orderId],
    queryFn: () => listShipments(apiClient, { orderId }),
    enabled: Boolean(orderId),
    retry: false,
  });
}

const PAYMENTS_QUERY_KEY = 'orders-payments';

/** `GET /payments?order_id=` — `PaymentController::index` (Payments' own), confirmed server-side filterable by reading it directly. */
export function useOrderPayments(orderId: string | undefined): UseQueryResult<ListEnvelope<PaymentDTO>> {
  return useQuery({
    queryKey: [PAYMENTS_QUERY_KEY, orderId],
    queryFn: () => listPayments(apiClient, { orderId }),
    enabled: Boolean(orderId),
    retry: false,
  });
}

const NOTIFICATIONS_QUERY_KEY = 'orders-notifications';

/**
 * Real, disclosed cross-module gap found independently by both the
 * Shipping Freeze Audit and the Payments Freeze Audit (`PROJECT_STATUS.md`
 * rows 30/35): this card originally queried only `related_type=order`, so
 * the real `shipment.dispatched`/`shipment.delivered` and
 * `payment.receipt` notifications those two modules' own listeners already
 * queue correctly (confirmed live by direct database query, per each
 * audit's own report) were invisible here even though they genuinely
 * exist and genuinely relate to this order. Closed here (Production
 * Completion Plan v2, Milestone 15): `related_id` for a payment/shipment
 * notification is the real Payment's/Shipment's own id, never the parent
 * Order's (confirmed by reading `SendPaymentReceiptOnPaymentCaptured`/
 * `SendShipmentNoticeOnShipmentDispatched` directly) — so this queries the
 * order's own real Payments/Shipments first (the identical, already-real
 * `useOrderPayments`/`useOrderShipments` queries the Payments/Fulfillment
 * cards already use), then one notification lookup per real payment/
 * shipment id, and merges every result with the order-level notifications
 * into one real, chronologically-sorted list.
 *
 * A caller lacking `payments.payments.view`/`fulfillment.shipments.view`
 * (this card's own permission, `notifications.notifications.view`, is
 * independent of both) simply never learns those ids, and this degrades
 * to exactly today's order-only behavior for them — never a hard error,
 * mirroring `useCustomerName`'s own established "missing permission
 * degrades gracefully, never worse than before" precedent.
 */
export function useOrderNotifications(orderId: string | undefined): UseQueryResult<NotificationDTO[]> {
  return useQuery({
    queryKey: [NOTIFICATIONS_QUERY_KEY, orderId],
    queryFn: async (): Promise<NotificationDTO[]> => {
      const id = orderId as string;

      const [orderResult, shipmentsResult, paymentsResult] = await Promise.all([
        listNotifications(apiClient, { relatedType: ORDER_RELATED_TYPE, relatedId: id }),
        listShipments(apiClient, { orderId: id }).catch((): ListEnvelope<ShipmentDTO> => ({ data: [] })),
        listPayments(apiClient, { orderId: id }).catch((): ListEnvelope<PaymentDTO> => ({ data: [] })),
      ]);

      const [shipmentNotificationLists, paymentNotificationLists] = await Promise.all([
        Promise.all(
          shipmentsResult.data.map((shipment) =>
            listNotifications(apiClient, { relatedType: SHIPMENT_RELATED_TYPE, relatedId: shipment.id }).catch(
              (): ListEnvelope<NotificationDTO> => ({ data: [] }),
            ),
          ),
        ),
        Promise.all(
          paymentsResult.data.map((payment) =>
            listNotifications(apiClient, { relatedType: PAYMENT_RELATED_TYPE, relatedId: payment.id }).catch(
              (): ListEnvelope<NotificationDTO> => ({ data: [] }),
            ),
          ),
        ),
      ]);

      return mergeNotifications(
        orderResult.data,
        shipmentNotificationLists.map((r) => r.data),
        paymentNotificationLists.map((r) => r.data),
      );
    },
    enabled: Boolean(orderId),
    retry: false,
  });
}
