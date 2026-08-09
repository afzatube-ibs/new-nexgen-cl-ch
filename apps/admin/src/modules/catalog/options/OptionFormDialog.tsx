import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Alert } from '@nexgen/ui';
import { ConflictError } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { useAuth } from '../../../auth/useAuth.js';
import { useOptions, useCreateOption, useUpdateOption } from './queries.js';
import { OptionValuesManager } from './OptionValuesManager.js';

const schema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(255)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Code may only contain letters, numbers, dashes, and underscores'),
  name: z.string().min(1, 'Name is required').max(255),
});
type FormValues = z.infer<typeof schema>;

export interface OptionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit (also unlocks `OptionValuesManager`); absent for create. */
  optionId?: string;
}

const EMPTY_VALUES: FormValues = { code: '', name: '' };

/**
 * Create/edit Option — `catalog.options.manage`. Sourced live from the
 * Options list query by id (not a passed-down snapshot) so its `version`
 * and `values` stay current across every `OptionValuesManager` mutation —
 * see that component's own docblock.
 */
export function OptionFormDialog({ open, onOpenChange, optionId }: OptionFormDialogProps) {
  const { can } = useAuth();
  const canManage = can('catalog.options.manage');
  const { data } = useOptions(undefined);
  const option = useMemo(() => data?.data.find((o) => o.id === optionId), [data, optionId]);
  const isEdit = Boolean(optionId);

  const createMutation = useCreateOption();
  const updateMutation = useUpdateOption();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_VALUES });

  useEffect(() => {
    if (open) reset(option ? { code: option.code, name: option.name } : EMPTY_VALUES);
    setFormError(null);
  }, [open, option, reset]);

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    try {
      if (isEdit && option) {
        await updateMutation.mutateAsync({ id: option.id, input: { ...values, expectedVersion: option.version } });
      } else {
        await createMutation.mutateAsync(values);
        onOpenChange(false);
      }
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      if (error instanceof ConflictError) {
        setFormError('This option was changed elsewhere — close this dialog and try again.');
        return;
      }
      setFormError('Something went wrong. Please try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit option' : 'New option'}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this option's details and values." : 'Create a new variant option (e.g. Color, Size).'}
          </DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="Code" hint="A unique machine-readable identifier." error={errors.code?.message} {...register('code')} />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              {isEdit ? 'Close' : 'Cancel'}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create option'}
            </Button>
          </DialogFooter>
        </form>

        {isEdit && option && (
          <div className="mt-6 border-t border-border pt-6">
            <OptionValuesManager option={option} canManage={canManage} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
