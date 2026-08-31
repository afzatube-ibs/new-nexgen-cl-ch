import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';
import type { NotificationTemplateDTO, ListNotificationTemplatesQuery, CreateNotificationTemplateInput, UpdateNotificationTemplateInput } from './types.js';

/** `apps/backend/.../Notifications/routes.php` — `notification-templates`, `notifications.templates.{view,manage}`. */
const BASE_PATH = '/notification-templates';

export function listNotificationTemplates(client: ApiClient, query?: ListNotificationTemplatesQuery): Promise<ListEnvelope<NotificationTemplateDTO>> {
  return client.get<ListEnvelope<NotificationTemplateDTO>>(BASE_PATH, {
    query: query && { channel: query.channel, code: query.code, q: query.q, page: query.page },
  });
}

export function getNotificationTemplate(client: ApiClient, id: string): Promise<NotificationTemplateDTO> {
  return client.get<DataEnvelope<NotificationTemplateDTO>>(`${BASE_PATH}/${id}`).then((r) => r.data);
}

export function createNotificationTemplate(client: ApiClient, input: CreateNotificationTemplateInput): Promise<NotificationTemplateDTO> {
  return client
    .post<DataEnvelope<NotificationTemplateDTO>>(BASE_PATH, {
      code: input.code,
      channel: input.channel,
      locale: input.locale || undefined,
      subject: input.subject,
      body: input.body,
      is_active: input.isActive,
    })
    .then((r) => r.data);
}

/** `UpdateNotificationTemplateRequest` — `code`/`channel`/`locale` are deliberately not sent: not editable after creation, confirmed absent from the real validation rules. */
export function updateNotificationTemplate(client: ApiClient, id: string, input: UpdateNotificationTemplateInput): Promise<NotificationTemplateDTO> {
  return client
    .patch<DataEnvelope<NotificationTemplateDTO>>(`${BASE_PATH}/${id}`, {
      subject: input.subject,
      body: input.body,
      is_active: input.isActive,
      expected_version: input.expectedVersion,
    })
    .then((r) => r.data);
}
