import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Textarea, Checkbox, Select, Alert } from '@nexgen/ui';
import { ConflictError, type NotificationTemplateDTO, type NotificationTemplateChannel } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { useCreateNotificationTemplate, useUpdateNotificationTemplate } from '../shared/queries.js';

const templateSchema = z.object({
  code: z.string().min(1, 'Code is required').max(150),
  locale: z.string().max(10).optional().or(z.literal('')),
  subject: z.string().max(255).optional().or(z.literal('')),
  body: z.string().min(1, 'Body is required'),
});
type TemplateFormValues = z.infer<typeof templateSchema>;

const CHANNEL_OPTIONS: { value: NotificationTemplateChannel; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'in_app', label: 'In-app' },
];

export interface NotificationTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit; absent for create. */
  template?: NotificationTemplateDTO;
}

const EMPTY_VALUES: TemplateFormValues = { code: '', locale: '', subject: '', body: '' };

function valuesFromTemplate(template?: NotificationTemplateDTO): TemplateFormValues {
  if (!template) return EMPTY_VALUES;
  return { code: template.code, locale: template.locale, subject: template.subject ?? '', body: template.body };
}

/**
 * Create/edit a Notification Template — `notifications.templates.manage`.
 * `code`/`channel`/`locale` are only ever sent on create (`UpdateNotificationTemplateRequest`'s
 * own real validation rules have no such keys, confirmed by reading it
 * directly) — shown read-only when editing rather than omitted, so an
 * operator can still see exactly which template they're changing. Only
 * one real send-capable channel exists in this platform today (email —
 * SMS/WhatsApp/In-app are contract-ready, not wired to a live provider,
 * per Notifications' own module docblock), but every `CHANNELS` value is
 * still offered here: authoring a template ahead of its provider is real,
 * legitimate content work, not something this screen should block.
 */
export function NotificationTemplateFormDialog({ open, onOpenChange, template }: NotificationTemplateFormDialogProps) {
  const isEdit = Boolean(template);
  const createMutation = useCreateNotificationTemplate();
  const updateMutation = useUpdateNotificationTemplate();
  const [formError, setFormError] = useState<string | null>(null);
  const [channel, setChannel] = useState<NotificationTemplateChannel>(template?.channel ?? 'email');
  const [isActive, setIsActive] = useState(template?.isActive ?? true);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TemplateFormValues>({ resolver: zodResolver(templateSchema), defaultValues: valuesFromTemplate(template) });

  useEffect(() => {
    if (open) {
      reset(valuesFromTemplate(template));
      setChannel(template?.channel ?? 'email');
      setIsActive(template?.isActive ?? true);
    }
    setFormError(null);
  }, [open, template, reset]);

  async function onSubmit(values: TemplateFormValues): Promise<void> {
    setFormError(null);
    try {
      if (isEdit && template) {
        await updateMutation.mutateAsync({
          id: template.id,
          input: { subject: values.subject || null, body: values.body, isActive, expectedVersion: template.version },
        });
      } else {
        await createMutation.mutateAsync({
          code: values.code,
          channel,
          locale: values.locale || undefined,
          subject: values.subject || null,
          body: values.body,
          isActive,
        });
      }
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      if (error instanceof ConflictError) {
        setFormError('This template was changed elsewhere — close this dialog and try again.');
        return;
      }
      setFormError('Something went wrong. Please try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit template' : 'New template'}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this template's subject, body, and active state." : 'Create a new notification template.'}
          </DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Code" hint="e.g. order.confirmed — matches templateCode in the code that queues it." error={errors.code?.message} disabled={isEdit} {...register('code')} />
          <Select label="Channel" value={channel} onValueChange={(v) => setChannel(v as NotificationTemplateChannel)} options={CHANNEL_OPTIONS} disabled={isEdit} />
          <Input label="Locale" hint="Defaults to en if left blank." error={errors.locale?.message} disabled={isEdit} {...register('locale')} />
          <Input label="Subject" error={errors.subject?.message} {...register('subject')} />
          <Textarea label="Body" hint="Merge fields render as {{field_name}}." error={errors.body?.message} rows={8} {...register('body')} />
          <Checkbox label="Active" checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
