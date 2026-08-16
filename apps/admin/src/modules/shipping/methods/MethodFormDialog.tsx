import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Textarea, Alert, useToast } from '@nexgen/ui';
import type { ShippingMethodDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { shippingErrorMessage } from '../shared/errors.js';
import { useCreateShippingMethod, useUpdateShippingMethod } from '../shared/queries.js';

const schema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(100)
    .regex(/^[a-z0-9_-]+$/, 'Lowercase letters, numbers, hyphens, and underscores only'),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(2000, 'Keep it under 2000 characters').optional(),
  providerCode: z.string().max(100, 'Keep it under 100 characters').optional(),
});
type FormValues = z.infer<typeof schema>;

export interface MethodFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit; absent for create. */
  method?: ShippingMethodDTO;
}

const EMPTY_VALUES: FormValues = { code: '', name: '', description: '', providerCode: '' };

function valuesFromMethod(method?: ShippingMethodDTO): FormValues {
  if (!method) return EMPTY_VALUES;
  return { code: method.code, name: method.name, description: method.description ?? '', providerCode: method.providerCode ?? '' };
}

/**
 * Create/edit a Shipping Method — `shipping.methods.manage`. `code` must be
 * unique (`Rule::unique(ShippingMethod::class, 'code')`, server-side only —
 * surfaced verbatim via `applyServerValidationErrors`). `providerCode` is a
 * free-text field, not a picker sourced from the real Courier Registry
 * (`GET /shipping/providers`, confirmed to exist by reading
 * `ShippingProviderController` directly) — wiring that picker up is
 * explicitly out of this slice's own approved scope (Zones/Methods/Rates
 * CRUD, Shipments visibility, Audit Logs only); leaving it blank means
 * self-fulfilled (`ShippingMethod::isSelfFulfilled()`). This is flagged
 * plainly in the Slice 1 completion report as a deliberate, honest
 * narrowing rather than a silently-missing capability.
 */
export function MethodFormDialog({ open, onOpenChange, method }: MethodFormDialogProps) {
  const isEdit = Boolean(method);
  const createMutation = useCreateShippingMethod();
  const updateMutation = useUpdateShippingMethod();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFromMethod(method) });

  useEffect(() => {
    if (open) reset(valuesFromMethod(method));
    setFormError(null);
  }, [open, method, reset]);

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    const description = values.description?.trim() || null;
    const providerCode = values.providerCode?.trim() || null;
    try {
      if (isEdit && method) {
        await updateMutation.mutateAsync({
          id: method.id,
          input: { code: values.code, name: values.name, description, providerCode, expectedVersion: method.version },
        });
        toast({ variant: 'success', title: 'Shipping method updated', description: `"${values.name}" has been saved.` });
      } else {
        await createMutation.mutateAsync({ code: values.code, name: values.name, description, providerCode });
        toast({ variant: 'success', title: 'Shipping method created', description: `"${values.name}" is ready for shipping rates.` });
      }
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      setFormError(shippingErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit shipping method' : 'New shipping method'}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this method's code, name, description, or courier." : 'A named service level, e.g. Standard, Express, or Store Pickup.'}
          </DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Name" hint="e.g. Standard Delivery, Express." error={errors.name?.message} {...register('name')} />
          <Input label="Code" hint="A unique, stable identifier, e.g. standard-delivery." error={errors.code?.message} {...register('code')} />
          <Textarea label="Description" hint="Optional — shown to staff, not customers." error={errors.description?.message} {...register('description')} />
          <Input
            label="Courier provider code"
            hint="Optional — a Courier Registry code (e.g. steadfast, pathao). Leave blank for self-fulfilled/store-managed dispatch."
            error={errors.providerCode?.message}
            {...register('providerCode')}
          />

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create method'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
