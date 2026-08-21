import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Alert, useToast } from '@nexgen/ui';
import type { TaxZoneDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { pricingErrorMessage } from '../shared/errors.js';
import { useCreateTaxZone, useUpdateTaxZone } from './queries.js';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  // Uppercased on submit, not here — the server's own `regex:/^[A-Z]{2}$/i`
  // rule already accepts either case; length-checked here only, matching
  // `PriceListFormDialog`'s own currency-code field precedent.
  countryCode: z.string().length(2, 'Enter a 2-letter country code, e.g. US'),
  region: z.string().max(100, 'Keep it under 100 characters').optional(),
});
type FormValues = z.infer<typeof schema>;

export interface TaxZoneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit; absent for create. */
  taxZone?: TaxZoneDTO;
}

const EMPTY_VALUES: FormValues = { name: '', countryCode: '', region: '' };

function valuesFromZone(zone?: TaxZoneDTO): FormValues {
  if (!zone) return EMPTY_VALUES;
  return { name: zone.name, countryCode: zone.countryCode, region: zone.region };
}

/**
 * Create/edit a Tax Zone — `pricing.tax.manage`. `region` left blank means
 * a country-wide zone (`TaxZone::isCountryWide()`'s own definition,
 * `CalculateTaxAction` matches the more specific zone first and falls back
 * to the country-wide one). The (country, region) uniqueness check is
 * server-side only (`CreateTaxZoneRequest`/`UpdateTaxZoneRequest`'s own
 * cross-field `withValidator`) — no client-side duplicate-guess here, the
 * server's own error is surfaced verbatim via `applyServerValidationErrors`.
 */
export function TaxZoneFormDialog({ open, onOpenChange, taxZone }: TaxZoneFormDialogProps) {
  const isEdit = Boolean(taxZone);
  const createMutation = useCreateTaxZone();
  const updateMutation = useUpdateTaxZone();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFromZone(taxZone) });

  useEffect(() => {
    if (open) reset(valuesFromZone(taxZone));
    setFormError(null);
  }, [open, taxZone, reset]);

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    const countryCode = values.countryCode.toUpperCase();
    // Uppercased here, not just trimmed — live-verified against the real
    // backend during this freeze audit that `TaxZone::booted()` normalizes
    // `country_code`'s case on every save but *never* `region`'s (confirmed
    // by reading the model directly), while `CalculateTaxAction::
    // resolveRate()` uppercases the shipping address's region before
    // matching it against `TaxZone.region` verbatim. A zone saved with a
    // lowercase region (e.g. "ca") therefore silently never matches at real
    // Checkout time — `CalculateTaxAction` falls through to the country-wide
    // zone (or zero tax, if none exists) instead of raising any error, so a
    // merchant would never see this until noticing an undercharged order.
    // Uppercasing here — the same treatment `countryCode` already gets,
    // immediately above — keeps every zone created or edited from this point
    // on internally consistent with how it's actually matched, without a
    // backend change. This does not repair zones already saved with a
    // lowercase region before this fix; that needs a backend data
    // normalization, out of this audit's frontend-only scope, and is called
    // out in the freeze audit report as a deferred backend fix.
    const region = (values.region?.trim() ?? '').toUpperCase();
    try {
      if (isEdit && taxZone) {
        await updateMutation.mutateAsync({
          id: taxZone.id,
          input: { name: values.name, countryCode, region, expectedVersion: taxZone.version },
        });
        toast({ variant: 'success', title: 'Tax zone updated', description: `"${values.name}" has been saved.` });
      } else {
        await createMutation.mutateAsync({ name: values.name, countryCode, region });
        toast({ variant: 'success', title: 'Tax zone created', description: `"${values.name}" is ready for tax rates.` });
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
          <DialogTitle>{isEdit ? 'Edit tax zone' : 'New tax zone'}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this zone's name, country, or region." : 'A geographic tax jurisdiction — one per country or sub-national region you collect tax in.'}
          </DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Name" hint="e.g. California, United States." error={errors.name?.message} {...register('name')} />
          <Input
            label="Country"
            hint="Two-letter ISO code, e.g. US, GB, DE."
            maxLength={2}
            className="uppercase"
            error={errors.countryCode?.message}
            {...register('countryCode')}
          />
          <Input
            label="Region"
            hint="Optional — a state/province code (e.g. CA). Leave blank for a country-wide zone."
            error={errors.region?.message}
            {...register('region')}
          />

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create tax zone'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
