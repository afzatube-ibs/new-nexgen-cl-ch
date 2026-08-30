import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Checkbox, Alert, useToast } from '@nexgen/ui';
import type { LocaleDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../framework/index.js';
import { localizationErrorMessage } from './shared/errors.js';
import { useCreateLocale, useUpdateLocale } from './shared/queries.js';

const schema = z.object({
  code: z
    .string()
    .min(2, 'e.g. en or en-US')
    .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, 'Use a real locale code, e.g. en or en-US'),
  name: z.string().min(1, 'Name is required').max(255),
  nativeName: z.string().min(1, 'Native name is required').max(255),
});

interface FormValues {
  code: string;
  name: string;
  nativeName: string;
}

const EMPTY_VALUES: FormValues = { code: '', name: '', nativeName: '' };

function valuesFromLocale(locale?: LocaleDTO): FormValues {
  if (!locale) return EMPTY_VALUES;
  return { code: locale.code, name: locale.name, nativeName: locale.nativeName };
}

export interface LocaleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit; absent for create. */
  locale?: LocaleDTO;
}

/**
 * Create/edit a Locale — `localization.locales.manage`. `isDefault` is
 * deliberately not editable here — promoting a locale to default is its
 * own dedicated action on `LocalesSection`'s own row menu, matching
 * `CreateLocaleRequest`'s/`Actions\CreateLocaleAction`'s own real
 * separation. `isRtl` is settable at create (a real, permanent property of
 * a script) but not offered on edit — the real backend accepts it on
 * update too, though changing writing direction for an existing locale is
 * a rare enough real edit that no dedicated control is offered here to
 * avoid presenting a checkbox that easily reads as "toggle for style."
 */
export function LocaleFormDialog({ open, onOpenChange, locale }: LocaleFormDialogProps) {
  const isEdit = Boolean(locale);
  const createMutation = useCreateLocale();
  const updateMutation = useUpdateLocale();
  const { toast } = useToast();
  const [isRtl, setIsRtl] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFromLocale(locale) });

  useEffect(() => {
    if (open) {
      reset(valuesFromLocale(locale));
      setIsRtl(locale?.isRtl ?? false);
    }
    setFormError(null);
  }, [open, locale, reset]);

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    try {
      if (isEdit && locale) {
        await updateMutation.mutateAsync({
          id: locale.id,
          input: { code: values.code, name: values.name, nativeName: values.nativeName, expectedVersion: locale.version },
        });
        toast({ variant: 'success', title: 'Locale updated' });
      } else {
        await createMutation.mutateAsync({ code: values.code, name: values.name, nativeName: values.nativeName, isRtl });
        toast({ variant: 'success', title: 'Locale created' });
      }
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      setFormError(localizationErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit locale' : 'New locale'}</DialogTitle>
          <DialogDescription>{isEdit ? "Update this locale's details." : 'Add a real locale this store can present content in.'}</DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Code" hint="e.g. en or en-US" error={errors.code?.message} {...register('code')} />
          <Input label="Name" hint="English name, e.g. French" error={errors.name?.message} {...register('name')} />
          <Input label="Native name" hint="e.g. Français" error={errors.nativeName?.message} {...register('nativeName')} />
          {!isEdit && <Checkbox label="Right-to-left script" checked={isRtl} onCheckedChange={(v) => setIsRtl(v === true)} />}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create locale'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
