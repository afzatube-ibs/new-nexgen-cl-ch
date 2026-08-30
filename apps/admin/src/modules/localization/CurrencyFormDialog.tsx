import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Alert, useToast } from '@nexgen/ui';
import type { CurrencyDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../framework/index.js';
import { localizationErrorMessage } from './shared/errors.js';
import { useCreateCurrency, useUpdateCurrency } from './shared/queries.js';

const schema = z.object({
  code: z.string().length(3, 'Must be exactly 3 letters (ISO 4217)').regex(/^[A-Za-z]+$/, 'Letters only'),
  name: z.string().min(1, 'Name is required').max(255),
  symbol: z.string().min(1, 'Symbol is required').max(10),
  exchangeRate: z.string().min(1, 'Exchange rate is required'),
});

interface FormValues {
  code: string;
  name: string;
  symbol: string;
  exchangeRate: string;
}

const EMPTY_VALUES: FormValues = { code: '', name: '', symbol: '', exchangeRate: '1.000000' };

function valuesFromCurrency(currency?: CurrencyDTO): FormValues {
  if (!currency) return EMPTY_VALUES;
  return { code: currency.code, name: currency.name, symbol: currency.symbol, exchangeRate: currency.exchangeRate };
}

export interface CurrencyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit; absent for create. */
  currency?: CurrencyDTO;
}

/**
 * Create/edit a Currency — `localization.currencies.manage`. `isBase` is
 * deliberately not editable here — promoting a currency to base is its own
 * dedicated action on `CurrenciesSection`'s own row menu, matching
 * `CreateCurrencyRequest`'s/`Actions\CreateCurrencyAction`'s own real
 * separation (see that Action's docblock).
 */
export function CurrencyFormDialog({ open, onOpenChange, currency }: CurrencyFormDialogProps) {
  const isEdit = Boolean(currency);
  const createMutation = useCreateCurrency();
  const updateMutation = useUpdateCurrency();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFromCurrency(currency) });

  useEffect(() => {
    if (open) reset(valuesFromCurrency(currency));
    setFormError(null);
  }, [open, currency, reset]);

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    try {
      if (isEdit && currency) {
        await updateMutation.mutateAsync({
          id: currency.id,
          input: { code: values.code.toUpperCase(), name: values.name, symbol: values.symbol, exchangeRate: values.exchangeRate, expectedVersion: currency.version },
        });
        toast({ variant: 'success', title: 'Currency updated' });
      } else {
        await createMutation.mutateAsync({ code: values.code.toUpperCase(), name: values.name, symbol: values.symbol, exchangeRate: values.exchangeRate });
        toast({ variant: 'success', title: 'Currency created' });
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
          <DialogTitle>{isEdit ? 'Edit currency' : 'New currency'}</DialogTitle>
          <DialogDescription>{isEdit ? "Update this currency's details." : 'Add a real currency this store can price and sell in.'}</DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Code" hint="ISO 4217, e.g. USD" maxLength={3} className="uppercase" error={errors.code?.message} {...register('code')} />
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="Symbol" error={errors.symbol?.message} {...register('symbol')} />
          <Input label="Exchange rate" hint="Relative to the base currency" error={errors.exchangeRate?.message} {...register('exchangeRate')} />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create currency'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
