import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import type { NotificationDTO, ListNotificationsQuery } from './types.js';

/** `apps/backend/.../Notifications/routes.php` — `notifications`, `notifications.notifications.view`. List only — see `types.ts`'s own docblock for why nothing else from Notifications is wrapped here. */
const BASE_PATH = '/notifications';

export function listNotifications(client: ApiClient, query?: ListNotificationsQuery): Promise<ListEnvelope<NotificationDTO>> {
  return client.get<ListEnvelope<NotificationDTO>>(BASE_PATH, {
    query: query && { status: query.status, channel: query.channel, related_type: query.relatedType, related_id: query.relatedId, page: query.page },
  });
}
