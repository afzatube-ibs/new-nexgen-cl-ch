import type { NotificationDTO } from '@nexgen/api-client';

/**
 * Pure merge/sort step for `useOrderNotifications` — extracted so the real
 * logic (combine every real notification list this order's lifecycle
 * genuinely triggered, newest first) is independently testable without
 * mocking `apiClient`/React Query. See that hook's own docblock for why
 * three separate lists exist in the first place (order/payment/shipment
 * notifications are queued under three different `related_id` values,
 * never the parent Order's).
 */
export function mergeNotifications(
  orderNotifications: NotificationDTO[],
  shipmentNotificationLists: NotificationDTO[][],
  paymentNotificationLists: NotificationDTO[][],
): NotificationDTO[] {
  const all = [...orderNotifications, ...shipmentNotificationLists.flat(), ...paymentNotificationLists.flat()];
  return all.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
}
