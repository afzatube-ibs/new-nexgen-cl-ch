import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import type { NotificationProviderDTO } from './types.js';

/**
 * `GET /notification-providers` — `NotificationProviderController::index`
 * (apps/backend), `notifications.providers.view`. A distinct
 * `notification-providers` path segment, not nested under `notifications/`
 * — that route's routes.php own docblock explains why (would collide with
 * `notifications/{notification}`'s wildcard binding).
 */
export function listNotificationProviders(client: ApiClient): Promise<ListEnvelope<NotificationProviderDTO>> {
  return client.get<ListEnvelope<NotificationProviderDTO>>('/notification-providers');
}
