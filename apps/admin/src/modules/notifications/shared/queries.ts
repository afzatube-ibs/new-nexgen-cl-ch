import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import {
  listNotifications,
  getNotification,
  retryNotification,
  cancelNotification,
  listNotificationTemplates,
  getNotificationTemplate,
  createNotificationTemplate,
  updateNotificationTemplate,
  type NotificationDTO,
  type ListNotificationsQuery,
  type CancelNotificationInput,
  type NotificationTemplateDTO,
  type ListNotificationTemplatesQuery,
  type CreateNotificationTemplateInput,
  type UpdateNotificationTemplateInput,
  type ListEnvelope,
} from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

const NOTIFICATIONS_QUERY_KEY = 'notifications';
const TEMPLATES_QUERY_KEY = 'notification-templates';

/** `NotificationController::index` — real server-side `status`/`channel`/`related_type`+`related_id` pair. */
export function useNotifications(query: ListNotificationsQuery): UseQueryResult<ListEnvelope<NotificationDTO>> {
  return useQuery({ queryKey: [NOTIFICATIONS_QUERY_KEY, 'list', query], queryFn: () => listNotifications(apiClient, query) });
}

/** `NotificationController::show` — the only query that returns real `deliveryAttempts`. */
export function useNotification(id: string | undefined): UseQueryResult<NotificationDTO> {
  return useQuery({
    queryKey: [NOTIFICATIONS_QUERY_KEY, 'detail', id],
    queryFn: () => getNotification(apiClient, id as string),
    enabled: Boolean(id),
  });
}

/** `POST /notifications/{id}/retry` — `notifications.notifications.manage`. No `expected_version` — see `retryNotification`'s own docblock. */
export function useRetryNotification(): UseMutationResult<NotificationDTO, unknown, { id: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => retryNotification(apiClient, id),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, 'list'] });
      void queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, 'detail', id] });
    },
  });
}

export function useCancelNotification(): UseMutationResult<NotificationDTO, unknown, { id: string; input: CancelNotificationInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => cancelNotification(apiClient, id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, 'list'] });
      void queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, 'detail', id] });
    },
  });
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/** `NotificationTemplateController::index` — real server-side `channel`/`code`/`q` (a genuine in-module free-text search, never routed through Search). */
export function useNotificationTemplates(query: ListNotificationTemplatesQuery): UseQueryResult<ListEnvelope<NotificationTemplateDTO>> {
  return useQuery({ queryKey: [TEMPLATES_QUERY_KEY, 'list', query], queryFn: () => listNotificationTemplates(apiClient, query) });
}

export function useNotificationTemplate(id: string | undefined): UseQueryResult<NotificationTemplateDTO> {
  return useQuery({
    queryKey: [TEMPLATES_QUERY_KEY, 'detail', id],
    queryFn: () => getNotificationTemplate(apiClient, id as string),
    enabled: Boolean(id),
  });
}

export function useCreateNotificationTemplate(): UseMutationResult<NotificationTemplateDTO, unknown, CreateNotificationTemplateInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => createNotificationTemplate(apiClient, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY, 'list'] }),
  });
}

export function useUpdateNotificationTemplate(): UseMutationResult<NotificationTemplateDTO, unknown, { id: string; input: UpdateNotificationTemplateInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => updateNotificationTemplate(apiClient, id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY, 'list'] });
      void queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY, 'detail', id] });
    },
  });
}
