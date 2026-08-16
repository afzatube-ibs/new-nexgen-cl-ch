import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Alert, useToast } from '@nexgen/ui';
import type { ShippingZoneDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { shippingErrorMessage } from '../shared/errors.js';
import { useCreateShippingZone, useUpdateShippingZone } from '../shared/queries.js';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  // Uppercased on submit, not here — the server's own `regex:/^[A-Z]{2}$/i` rule already accepts either case; length-checked here only.
  countryCode: z.string().length(2, 'Enter a 2-letter country code, e.g. US'),
  region: z.string().max(100, 'Keep it under 100 characters').optional(),
});
type FormValues = z.infer<typeof schema>;

export interface ZoneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit; absent for create. */
  zone?: ShippingZoneDTO;
}

const EMPTY_VALUES: FormValues = { name: '', countryCode: '', region: '' };

function valuesFromZone(zone?: ShippingZoneDTO): FormValues {
  if (!zone) return EMPTY_VALUES;
  return { name: zone.name, countryCode: zone.countryCode, region: zone.region };
}

/**
 * Create/edit a Shipping Zone — `shipping.zones.manage`. `region` left
 * blank means a country-wide zone (`ShippingZone::isCountryWide()`'s own
 * definition; `CalculateShippingRateAction` matches the more specific zone
 * first and falls back to the country-wide one). The (country, region)
 * uniqueness check is server-side only (`CreateShippingZoneRequest`/
 * `UpdateShippingZoneRequest`'s own cross-field `withValidator`) — no
 * client-side duplicate-guess here, the server's own error is surfaced
 * verbatim via `applyServerValidationErrors`. Region is uppercased on
 * submit, matching `countryCode`'s own treatment — `ShippingZone::booted()`
 * normalizes `country_code`'s case on every save but never `region`'s
 * (confirmed by reading the model directly), and `CalculateShippingRateAction`
 * uppercases the caller-supplied region before matching it against
 * `ShippingZone.region` verbatim — keeping every zone created here
 * internally consistent with how it's actually matched.
 */
export function ZoneFormDialog({ open, onOpenChange, zone }: ZoneFormDialogProps) {
  const isEdit = Boolean(zone);
  const createMutation = useCreateShippingZone();
  const updateMutation = useUpdateShippingZone();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFromZone(zone) });

  useEffect(() => {
    if (open) reset(valuesFromZone(zone));
    setFormError(null);
  }, [open, zone, reset]);

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    const countryCode = values.countryCode.toUpperCase();
    const region = (values.region?.trim() ?? '').toUpperCase();
    try {
      if (isEdit && zone) {
        await updateMutation.mutateAsync({
          id: zone.id,
          input: { name: values.name, countryCode, region, expectedVersion: zone.version },
        });
        toast({ variant: 'success', title: 'Shipping zone updated', description: `"${values.name}" has been saved.` });
      } else {
        await createMutation.mutateAsync({ name: values.name, countryCode, region });
        toast({ variant: 'success', title: 'Shipping zone created', description: `"${values.name}" is ready for shipping rates.` });
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
          <DialogTitle>{isEdit ? 'Edit shipping zone' : 'New shipping zone'}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this zone's name, country, or region." : 'A geographic delivery jurisdiction — one per country or sub-national region you ship to.'}
          </DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Name" hint="e.g. Dhaka Metro, Rest of Bangladesh." error={errors.name?.message} {...register('name')} />
          <Input
            label="Country"
            hint="Two-letter ISO code, e.g. BD, US, GB."
            maxLength={2}
            className="uppercase"
            error={errors.countryCode?.message}
            {...register('countryCode')}
          />
          <Input
            label="Region"
            hint="Optional — a state/division code. Leave blank for a country-wide zone."
            error={errors.region?.message}
            {...register('region')}
          />

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create zone'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
