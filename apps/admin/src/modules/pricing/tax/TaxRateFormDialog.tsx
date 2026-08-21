import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Select, Alert, useToast } from '@nexgen/ui';
import type { TaxRateDTO, TaxZoneDTO, TaxClassDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { pricingErrorMessage } from '../shared/errors.js';
import { useCreateTaxRate, useUpdateTaxRate } from './queries.js';

const schema = z.object({
  taxZoneId: z.string().min(1, 'Select a tax zone'),
  taxClassId: z.string().min(1, 'Select a tax class'),
  rate: z.coerce.number({ message: 'Enter a rate' }).min(0, 'Must be 0 or greater').max(100, 'Must be 100 or less'),
});
type FormValues = z.infer<typeof schema>;

export interface TaxRateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit; absent for create. */
  taxRate?: TaxRateDTO;
  taxZones: TaxZoneDTO[];
  taxClasses: TaxClassDTO[];
}

const EMPTY_VALUES: FormValues = { taxZoneId: '', taxClassId: '', rate: Number.NaN };

function valuesFromRate(rate?: TaxRateDTO): FormValues {
  if (!rate) return EMPTY_VALUES;
  return { taxZoneId: rate.taxZoneId, taxClassId: rate.taxClassId, rate: Number(rate.rate) };
}

function zoneLabel(zone: TaxZoneDTO): string {
  const place = zone.region ? `${zone.countryCode}-${zone.region}` : zone.countryCode;
  return `${zone.name} (${place})`;
}

/**
 * Create/edit a Tax Rate — `pricing.tax.manage`. `rate` is a percentage
 * (`decimal(8,4)`, e.g. `8.5000` means 8.5%) applied when `taxClassId` is
 * taxed within `taxZoneId` — `CreateTaxRateRequest`'s own `min:0`/`max:100`.
 * The (zone, class) pair must be unique — the server's own cross-field
 * check is surfaced verbatim via `applyServerValidationErrors`, no
 * client-side duplicate-guess.
 *
 * Zone/Class pickers default to active options only — assigning a *new*
 * rate to an already-archived zone or class has no merchant purpose — but
 * always include the rate's own current zone/class even if archived, so
 * editing an existing rate never loses its own selection.
 */
export function TaxRateFormDialog({ open, onOpenChange, taxRate, taxZones, taxClasses }: TaxRateFormDialogProps) {
  const isEdit = Boolean(taxRate);
  const createMutation = useCreateTaxRate();
  const updateMutation = useUpdateTaxRate();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFromRate(taxRate) });

  useEffect(() => {
    if (open) reset(valuesFromRate(taxRate));
    setFormError(null);
  }, [open, taxRate, reset]);

  const zoneOptions = useMemo(() => {
    const options = taxZones.filter((z) => z.status === 'active').map((z) => ({ value: z.id, label: zoneLabel(z) }));
    if (taxRate && !options.some((o) => o.value === taxRate.taxZoneId)) {
      const current = taxZones.find((z) => z.id === taxRate.taxZoneId);
      if (current) options.push({ value: current.id, label: `${zoneLabel(current)} — archived` });
    }
    return options;
  }, [taxZones, taxRate]);

  const classOptions = useMemo(() => {
    const options = taxClasses.filter((c) => c.status === 'active').map((c) => ({ value: c.id, label: c.name }));
    if (taxRate && !options.some((o) => o.value === taxRate.taxClassId)) {
      const current = taxClasses.find((c) => c.id === taxRate.taxClassId);
      if (current) options.push({ value: current.id, label: `${current.name} — archived` });
    }
    return options;
  }, [taxClasses, taxRate]);

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    const rate = String(values.rate);
    try {
      if (isEdit && taxRate) {
        await updateMutation.mutateAsync({
          id: taxRate.id,
          input: { taxZoneId: values.taxZoneId, taxClassId: values.taxClassId, rate, expectedVersion: taxRate.version },
        });
        toast({ variant: 'success', title: 'Tax rate updated', description: 'The rate has been saved.' });
      } else {
        await createMutation.mutateAsync({ taxZoneId: values.taxZoneId, taxClassId: values.taxClassId, rate });
        toast({ variant: 'success', title: 'Tax rate created', description: 'The new rate is ready.' });
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
          <DialogTitle>{isEdit ? 'Edit tax rate' : 'New tax rate'}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this rate's zone, class, or percentage." : 'The rate applied when a tax class is taxed within a tax zone.'}
          </DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Controller
            control={control}
            name="taxZoneId"
            render={({ field }) => (
              <Select label="Tax zone" value={field.value} onValueChange={field.onChange} options={zoneOptions} error={errors.taxZoneId?.message} />
            )}
          />
          <Controller
            control={control}
            name="taxClassId"
            render={({ field }) => (
              <Select label="Tax class" value={field.value} onValueChange={field.onChange} options={classOptions} error={errors.taxClassId?.message} />
            )}
          />
          <Input
            type="number"
            min={0}
            max={100}
            step="0.0001"
            label="Rate"
            hint="A percentage, e.g. 8.5 for 8.5%. Between 0 and 100."
            error={errors.rate?.message}
            {...register('rate')}
          />

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create tax rate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
