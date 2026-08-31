import type { ApiClient } from '../client.js';
import type { DataEnvelope } from '../types.js';
import type { NotificationDTO, CancelNotificationInput } from './types.js';

const BASE_PATH = '/notifications';

/** `NotificationController::show` — the only query that returns real `deliveryAttempts` (`whenLoaded()`). */
export function getNotification(client: ApiClient, id: string): Promise<NotificationDTO> {
  return client.get<DataEnvelope<NotificationDTO>>(`${BASE_PATH}/${id}`).then((r) => r.data);
}

/** `POST /notifications/{id}/retry` — `notifications.notifications.manage`. No `expected_version` — `RetryNotificationAction` performs no optimistic-lock check (confirmed by reading `NotificationWorkflowController::retry` directly, a plain `Request`, not `ExpectedVersionRequest`). */
export function retryNotification(client: ApiClient, id: string): Promise<NotificationDTO> {
  return client.post<DataEnvelope<NotificationDTO>>(`${BASE_PATH}/${id}/retry`).then((r) => r.data);
}

/** `POST /notifications/{id}/cancel` — `notifications.notifications.manage`. */
export function cancelNotification(client: ApiClient, id: string, input: CancelNotificationInput): Promise<NotificationDTO> {
  return client.post<DataEnvelope<NotificationDTO>>(`${BASE_PATH}/${id}/cancel`, { expected_version: input.expectedVersion }).then((r) => r.data);
}
