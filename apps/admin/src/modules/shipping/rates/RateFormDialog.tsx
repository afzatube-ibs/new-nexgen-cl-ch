import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Select, Checkbox, Alert, useToast } from '@nexgen/ui';
import type { ShippingRateDTO, ShippingZoneDTO, ShippingMethodDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { shippingErrorMessage } from '../shared/errors.js';
import { useCreateShippingRate, useUpdateShippingRate } from '../shared/queries.js';

const schema = z
  .object({
    shippingZoneId: z.string().min(1, 'Select a shipping zone'),
    shippingMethodId: z.string().min(1, 'Select a shipping method'),
    minWeightGrams: z.coerce.number({ message: 'Enter a minimum weight' }).int('Whole grams only').min(0, 'Must be 0 or greater'),
    hasMaxWeight: z.boolean(),
    maxWeightGrams: z.coerce.number().int('Whole grams only').min(0).optional(),
    amount: z.coerce.number({ message: 'Enter an amount' }).min(0, 'Must be 0 or greater'),
    currencyCode: z.string().length(3, 'Enter a 3-letter currency code, e.g. BDT'),
  })
  .refine((v) => !v.hasMaxWeight || v.maxWeightGrams === undefined || v.maxWeightGrams > v.minWeightGrams, {
    message: 'Maximum weight must be greater than the minimum',
    path: ['maxWeightGrams'],
  });
type FormValues = z.infer<typeof schema>;

export interface RateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit; absent for create. */
  rate?: ShippingRateDTO;
  zones: ShippingZoneDTO[];
  methods: ShippingMethodDTO[];
}

const EMPTY_VALUES: FormValues = {
  shippingZoneId: '',
  shippingMethodId: '',
  minWeightGrams: 0,
  hasMaxWeight: false,
  maxWeightGrams: undefined,
  amount: Number.NaN,
  currencyCode: '',
};

function valuesFromRate(rate?: ShippingRateDTO): FormValues {
  if (!rate) return EMPTY_VALUES;
  return {
    shippingZoneId: rate.shippingZoneId,
    shippingMethodId: rate.shippingMethodId,
    minWeightGrams: rate.minWeightGrams,
    hasMaxWeight: rate.maxWeightGrams !== null,
    maxWeightGrams: rate.maxWeightGrams ?? undefined,
    amount: Number(rate.amount),
    currencyCode: rate.currencyCode,
  };
}

function zoneLabel(zone: ShippingZoneDTO): string {
  const place = zone.region ? `${zone.countryCode}-${zone.region}` : zone.countryCode;
  return `${zone.name} (${place})`;
}

/**
 * Create/edit a Shipping Rate — `shipping.rates.manage`. `amount` is a real
 * money value in `currencyCode` (`decimal`, validated server-side against
 * Localization & Currency's active-currency list). A blank "maximum weight"
 * means unbounded above (`ShippingRate::coversWeight()`'s own `[min, max)`
 * semantics) — modeled as a checkbox rather than an empty-means-infinite
 * number field, since a merchant leaving it blank by accident (vs.
 * deliberately unbounded) is a real, easy-to-make mistake this UI can
 * prevent without inventing any new business rule. The (zone, method,
 * min-weight) uniqueness check is server-side only (`CreateShippingRateRequest`'s
 * own compound `Rule::unique`) — surfaced verbatim via
 * `applyServerValidationErrors`.
 *
 * Zone/Method pickers default to active options only — assigning a *new*
 * rate to an already-archived zone or method has no merchant purpose — but
 * always include the rate's own current zone/method even if archived, so
 * editing an existing rate never loses its own selection.
 */
export function RateFormDialog({ open, onOpenChange, rate, zones, methods }: RateFormDialogProps) {
  const isEdit = Boolean(rate);
  const createMutation = useCreateShippingRate();
  const updateMutation = useUpdateShippingRate();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFromRate(rate) });

  const hasMaxWeight = watch('hasMaxWeight');

  useEffect(() => {
    if (open) reset(valuesFromRate(rate));
    setFormError(null);
  }, [open, rate, reset]);

  const zoneOptions = useMemo(() => {
    const options = zones.filter((z) => z.status === 'active').map((z) => ({ value: z.id, label: zoneLabel(z) }));
    if (rate && !options.some((o) => o.value === rate.shippingZoneId)) {
      const current = zones.find((z) => z.id === rate.shippingZoneId);
      if (current) options.push({ value: current.id, label: `${zoneLabel(current)} — archived` });
    }
    return options;
  }, [zones, rate]);

  const methodOptions = useMemo(() => {
    const options = methods.filter((m) => m.status === 'active').map((m) => ({ value: m.id, label: m.name }));
    if (rate && !options.some((o) => o.value === rate.shippingMethodId)) {
      const current = methods.find((m) => m.id === rate.shippingMethodId);
      if (current) options.push({ value: current.id, label: `${current.name} — archived` });
    }
    return options;
  }, [methods, rate]);

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    const amount = values.amount.toFixed(4);
    const maxWeightGrams = values.hasMaxWeight ? (values.maxWeightGrams ?? null) : null;
    const currencyCode = values.currencyCode.toUpperCase();
    try {
      if (isEdit && rate) {
        await updateMutation.mutateAsync({
          id: rate.id,
          input: { minWeightGrams: values.minWeightGrams, maxWeightGrams, amount, currencyCode, expectedVersion: rate.version },
        });
        toast({ variant: 'success', title: 'Shipping rate updated', description: 'The rate has been saved.' });
      } else {
        await createMutation.mutateAsync({
          shippingZoneId: values.shippingZoneId,
          shippingMethodId: values.shippingMethodId,
          minWeightGrams: values.minWeightGrams,
          maxWeightGrams,
          amount,
          currencyCode,
        });
        toast({ variant: 'success', title: 'Shipping rate created', description: 'The new rate is ready.' });
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
          <DialogTitle>{isEdit ? 'Edit shipping rate' : 'New shipping rate'}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this rate's weight band, amount, or currency." : 'The price charged when a shipping method is used within a zone, banded by parcel weight.'}
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
            name="shippingZoneId"
            render={({ field }) => (
              <Select label="Shipping zone" value={field.value} onValueChange={field.onChange} options={zoneOptions} error={errors.shippingZoneId?.message} disabled={isEdit} />
            )}
          />
          <Controller
            control={control}
            name="shippingMethodId"
            render={({ field }) => (
              <Select label="Shipping method" value={field.value} onValueChange={field.onChange} options={methodOptions} error={errors.shippingMethodId?.message} disabled={isEdit} />
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              min={0}
              step="1"
              label="Min weight (g)"
              hint="Inclusive."
              error={errors.minWeightGrams?.message}
              {...register('minWeightGrams')}
            />
            <div className="flex flex-col gap-1.5">
              <Input
                type="number"
                min={0}
                step="1"
                label="Max weight (g)"
                hint={hasMaxWeight ? 'Exclusive.' : 'Unbounded above.'}
                disabled={!hasMaxWeight}
                error={errors.maxWeightGrams?.message}
                {...register('maxWeightGrams')}
              />
            </div>
          </div>
          <Controller
            control={control}
            name="hasMaxWeight"
            render={({ field }) => (
              <Checkbox
                label="Set a maximum weight"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(Boolean(checked))}
              />
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input type="number" min={0} step="0.0001" label="Amount" error={errors.amount?.message} {...register('amount')} />
            <Input
              label="Currency"
              hint="e.g. BDT, USD."
              maxLength={3}
              className="uppercase"
              error={errors.currencyCode?.message}
              {...register('currencyCode')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create rate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
