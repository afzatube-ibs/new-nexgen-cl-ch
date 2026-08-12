import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Checkbox, Alert, Text, useToast } from '@nexgen/ui';
import type { PriceListDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { pricingErrorMessage } from '../shared/errors.js';
import { useCreatePriceList, useUpdatePriceList } from './queries.js';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  /** Uppercased on submit, not here — `IsValidCurrencyCode`'s real ISO 4217 active-currency list stays the single source of truth for the exact rule; a merchant typing "usd" shouldn't see a client-side rejection for a case difference the server will happily accept once normalized. Length-checked here only (`size:3`) since that much is unambiguous regardless of which currencies are valid. */
  currencyCode: z.string().length(3, 'Enter a 3-letter currency code, e.g. USD'),
  isDefault: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export interface PriceListFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit; absent for create. */
  priceList?: PriceListDTO;
}

const EMPTY_VALUES: FormValues = { name: '', currencyCode: '', isDefault: false };

function valuesFromPriceList(priceList?: PriceListDTO): FormValues {
  if (!priceList) return EMPTY_VALUES;
  return { name: priceList.name, currencyCode: priceList.currencyCode, isDefault: priceList.isDefault };
}

/**
 * Create/edit Price List — `pricing.price_lists.manage`. `isDefault` is
 * only ever shown (and only ever sent) on edit: `CreatePriceListAction`
 * never accepts it — every new list starts non-default, promoting one to
 * default is a separate, explicit act — so showing a checkbox on create
 * that the backend would silently ignore would be actively misleading
 * rather than merely unused.
 */
export function PriceListFormDialog({ open, onOpenChange, priceList }: PriceListFormDialogProps) {
  const isEdit = Boolean(priceList);
  const createMutation = useCreatePriceList();
  const updateMutation = useUpdatePriceList();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFromPriceList(priceList) });

  useEffect(() => {
    if (open) reset(valuesFromPriceList(priceList));
    setFormError(null);
  }, [open, priceList, reset]);

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    const currencyCode = values.currencyCode.toUpperCase();
    try {
      if (isEdit && priceList) {
        await updateMutation.mutateAsync({
          id: priceList.id,
          input: { name: values.name, currencyCode, isDefault: values.isDefault, expectedVersion: priceList.version },
        });
        toast({ variant: 'success', title: 'Price list updated', description: `"${values.name}" has been saved.` });
      } else {
        await createMutation.mutateAsync({ name: values.name, currencyCode });
        toast({ variant: 'success', title: 'Price list created', description: `"${values.name}" is ready for pricing.` });
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
          <DialogTitle>{isEdit ? 'Edit price list' : 'New price list'}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this price list's name or currency." : 'A named, currency-scoped collection of prices — one per market or channel.'}
          </DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Name" hint="e.g. Standard Retail, EU Wholesale." error={errors.name?.message} {...register('name')} />
          <Input
            label="Currency"
            hint="Three-letter ISO code, e.g. USD, EUR, GBP."
            maxLength={3}
            className="uppercase"
            error={errors.currencyCode?.message}
            {...register('currencyCode')}
          />

          {isEdit && (
            <div>
              <Controller
                control={control}
                name="isDefault"
                render={({ field }) => (
                  <Checkbox
                    label={`Default price list for ${priceList?.currencyCode ?? 'this currency'}`}
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                )}
              />
              <Text variant="caption" className="mt-1 text-text-secondary">
                Checkout only ever resolves prices from the default list in a given currency. Setting this unsets any other default in{' '}
                {priceList?.currencyCode ?? 'this currency'} automatically.
              </Text>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create price list'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
