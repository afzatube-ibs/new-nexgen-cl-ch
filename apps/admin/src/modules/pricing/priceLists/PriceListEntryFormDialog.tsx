import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Alert, Text, useToast } from '@nexgen/ui';
import type { PriceListDTO, PriceListEntryDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { pricingErrorMessage } from '../shared/errors.js';
import { useCatalogProductBySku } from '../shared/catalogLookup.js';
import { useCreatePriceListEntry, useUpdatePriceListEntry } from './queries.js';

/** Debounces a fast-changing value (keystrokes) before it drives a network lookup — duplicated locally rather than shared, matching Inventory's own established "own its own copy" precedent for this exact small utility (`InitiateTransferDialog.tsx`). */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * An optional positive-number field, fed by a plain text `<Input>`. Plain
 * `z.coerce.number()` alone is the wrong tool here: `Number('')` is `0`,
 * not `NaN` — so a naive `z.union([z.coerce.number().positive(), z.nan()])`
 * (this file's own first draft) never actually recognizes an empty input
 * as "left blank," and silently fails validation on every submit that
 * leaves this field empty, blocking the whole form with no visible error
 * (caught live: adding a price with no sale price hung with no feedback).
 * Preprocessing the empty/undefined case to `undefined` *before*
 * coercion is what makes "optional" actually mean optional.
 */
const optionalPositivePrice = z.preprocess(
  (val) => (val === '' || val === undefined || val === null ? undefined : val),
  z.coerce.number().positive('Enter a price greater than zero').optional(),
);

const schema = z
  .object({
    sku: z.string().min(1, 'SKU is required').max(100),
    basePrice: z.coerce.number({ message: 'Enter a price' }).positive('Enter a price greater than zero'),
    compareAtPrice: optionalPositivePrice,
    salePrice: optionalPositivePrice,
    saleStartsAt: z.string().optional(),
    saleEndsAt: z.string().optional(),
  })
  .refine((v) => v.salePrice === undefined || v.salePrice < v.basePrice, {
    message: 'The sale price must be less than the base price.',
    path: ['salePrice'],
  })
  .refine((v) => !v.saleStartsAt || !v.saleEndsAt || new Date(v.saleEndsAt) > new Date(v.saleStartsAt), {
    message: 'The sale end must be after the sale start.',
    path: ['saleEndsAt'],
  });
type FormValues = z.infer<typeof schema>;

export interface PriceListEntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceList: PriceListDTO;
  /** Present for edit; absent for create. */
  entry?: PriceListEntryDTO;
  /** Pre-fills the SKU field on create only (ignored when `entry` is set) — lets Missing Price Detection's "Add price" row action skip retyping a SKU it already found. */
  initialSku?: string;
}

const EMPTY_VALUES: FormValues = {
  sku: '',
  basePrice: Number.NaN,
  compareAtPrice: undefined,
  salePrice: undefined,
  saleStartsAt: '',
  saleEndsAt: '',
};

function valuesFromEntry(entry?: PriceListEntryDTO): FormValues {
  if (!entry) return EMPTY_VALUES;
  return {
    sku: entry.sku,
    basePrice: Number(entry.basePrice),
    compareAtPrice: entry.compareAtPrice ? Number(entry.compareAtPrice) : undefined,
    salePrice: entry.salePrice ? Number(entry.salePrice) : undefined,
    saleStartsAt: toDatetimeLocal(entry.saleStartsAt),
    saleEndsAt: toDatetimeLocal(entry.saleEndsAt),
  };
}

/**
 * Create/edit one SKU's pricing within a Price List — `pricing.price_lists.
 * manage`. `base_price` is the standing price; `compare_at_price` is a
 * pure display "was" value (never read by any calculation — `planning/
 * architecture/PHASE_2_4_PRICING_ARCHITECTURE.md` §2.2); `sale_price` +
 * its optional schedule window together implement "Sale Price" and
 * "Scheduled Pricing" as one mechanism, resolved server-side at read time
 * (`PriceListEntry::effectivePrice()`), never a separate discount rule.
 */
export function PriceListEntryFormDialog({ open, onOpenChange, priceList, entry, initialSku }: PriceListEntryFormDialogProps) {
  const isEdit = Boolean(entry);
  const createMutation = useCreatePriceListEntry(priceList.id);
  const updateMutation = useUpdatePriceListEntry(priceList.id);
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFromEntry(entry) });

  useEffect(() => {
    if (open) reset(entry ? valuesFromEntry(entry) : { ...EMPTY_VALUES, sku: initialSku ?? '' });
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialSku is only meant to apply on open, not re-run every keystroke elsewhere
  }, [open, entry, reset]);

  const watchedSku = watch('sku');
  const debouncedSku = useDebouncedValue(watchedSku, 400);
  const { data: matchedProduct, isFetching: isMatching } = useCatalogProductBySku(debouncedSku);

  function toApiNumber(value: number | undefined): string | null | undefined {
    return value === undefined ? null : String(value);
  }

  function toApiDate(value: string | undefined): string | null | undefined {
    return value ? new Date(value).toISOString() : null;
  }

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    try {
      if (isEdit && entry) {
        await updateMutation.mutateAsync({
          entryId: entry.id,
          input: {
            sku: values.sku,
            basePrice: String(values.basePrice),
            compareAtPrice: toApiNumber(values.compareAtPrice),
            salePrice: toApiNumber(values.salePrice),
            saleStartsAt: toApiDate(values.saleStartsAt),
            saleEndsAt: toApiDate(values.saleEndsAt),
            expectedVersion: entry.version,
          },
        });
        toast({ variant: 'success', title: 'Price updated', description: `${values.sku} has been saved.` });
      } else {
        await createMutation.mutateAsync({
          sku: values.sku,
          basePrice: String(values.basePrice),
          compareAtPrice: toApiNumber(values.compareAtPrice),
          salePrice: toApiNumber(values.salePrice),
          saleStartsAt: toApiDate(values.saleStartsAt),
          saleEndsAt: toApiDate(values.saleEndsAt),
        });
        toast({ variant: 'success', title: 'Price added', description: `${values.sku} is now priced in ${priceList.currencyCode}.` });
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
          <DialogTitle>{isEdit ? 'Edit price' : 'Add price'}</DialogTitle>
          <DialogDescription>
            {isEdit ? `Update this SKU's pricing in ${priceList.name} (${priceList.currencyCode}).` : `Price a SKU in ${priceList.name} (${priceList.currencyCode}).`}
          </DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div>
            <Input label="SKU" error={errors.sku?.message} {...register('sku')} />
            <Text variant="caption" className="mt-1 text-text-secondary" role="status">
              {!watchedSku.trim()
                ? 'Matches a Catalog product automatically as you type.'
                : isMatching
                  ? 'Checking Catalog…'
                  : matchedProduct
                    ? `Matches: ${matchedProduct.name}`
                    : 'No matching Catalog product — you can still price this SKU.'}
            </Text>
          </div>

          <Input
            type="number"
            min={0.01}
            step="0.01"
            label="Base price"
            hint={`In ${priceList.currencyCode}.`}
            error={errors.basePrice?.message}
            {...register('basePrice')}
          />
          <Input
            type="number"
            min={0.01}
            step="0.01"
            label="Compare-at price"
            hint="Optional — the “was” price shown alongside the base price. Display only, never used in any calculation."
            error={errors.compareAtPrice?.message}
            {...register('compareAtPrice')}
          />

          <Text variant="body-strong" className="mt-2">
            Sale <span className="text-text-secondary font-normal">(optional)</span>
          </Text>
          <Input
            type="number"
            min={0.01}
            step="0.01"
            label="Sale price"
            hint="Must be less than the base price. Active immediately unless a start date is set below."
            error={errors.salePrice?.message}
            {...register('salePrice')}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input type="datetime-local" label="Sale starts" hint="Leave blank to start immediately." error={errors.saleStartsAt?.message} {...register('saleStartsAt')} />
            <Input type="datetime-local" label="Sale ends" hint="Leave blank for no end date." error={errors.saleEndsAt?.message} {...register('saleEndsAt')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Add price'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
