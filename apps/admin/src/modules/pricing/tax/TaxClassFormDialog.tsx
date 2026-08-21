import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Alert, useToast } from '@nexgen/ui';
import type { TaxClassDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { pricingErrorMessage } from '../shared/errors.js';
import { useCreateTaxClass, useUpdateTaxClass } from './queries.js';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
});
type FormValues = z.infer<typeof schema>;

export interface TaxClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit; absent for create. */
  taxClass?: TaxClassDTO;
}

const EMPTY_VALUES: FormValues = { name: '' };

function valuesFromClass(taxClass?: TaxClassDTO): FormValues {
  return taxClass ? { name: taxClass.name } : EMPTY_VALUES;
}

/**
 * Create/edit a Tax Class — `pricing.tax.manage`. `name` is unique
 * platform-wide (`tax_classes.name`, a real unique index) — the server's
 * own 422 is surfaced verbatim via `applyServerValidationErrors`, no
 * client-side duplicate-guess.
 */
export function TaxClassFormDialog({ open, onOpenChange, taxClass }: TaxClassFormDialogProps) {
  const isEdit = Boolean(taxClass);
  const createMutation = useCreateTaxClass();
  const updateMutation = useUpdateTaxClass();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFromClass(taxClass) });

  useEffect(() => {
    if (open) reset(valuesFromClass(taxClass));
    setFormError(null);
  }, [open, taxClass, reset]);

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    try {
      if (isEdit && taxClass) {
        await updateMutation.mutateAsync({ id: taxClass.id, input: { name: values.name, expectedVersion: taxClass.version } });
        toast({ variant: 'success', title: 'Tax class updated', description: `"${values.name}" has been saved.` });
      } else {
        await createMutation.mutateAsync({ name: values.name });
        toast({ variant: 'success', title: 'Tax class created', description: `"${values.name}" is ready to assign tax rates.` });
      }
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      setFormError(pricingErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit tax class' : 'New tax class'}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this class's name." : 'A tax classification a product belongs to, e.g. Standard, Reduced, Zero-Rated, Exempt.'}
          </DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Name" hint="e.g. Standard, Reduced, Zero-Rated, Exempt." error={errors.name?.message} {...register('name')} />

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create tax class'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
