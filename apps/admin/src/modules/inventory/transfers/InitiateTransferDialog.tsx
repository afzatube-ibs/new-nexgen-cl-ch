import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Select, Alert, Text, useToast } from '@nexgen/ui';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { inventoryErrorMessage } from '../shared/errors.js';
import { useCatalogProductBySku } from '../shared/catalogLookup.js';
import { useAllWarehouses } from '../warehouses/queries.js';
import { useCurrentStockItem } from '../stockLevels/queries.js';
import { useInitiateStockTransfer } from './queries.js';

const schema = z
  .object({
    fromWarehouseId: z.string().min(1, 'Choose a source warehouse'),
    toWarehouseId: z.string().min(1, 'Choose a destination warehouse'),
    sku: z.string().min(1, 'SKU is required').max(100),
    quantity: z.coerce.number().int('Whole numbers only').positive('Enter a quantity greater than zero'),
  })
  .refine((v) => !v.fromWarehouseId || !v.toWarehouseId || v.fromWarehouseId !== v.toWarehouseId, {
    message: 'Choose two different warehouses',
    path: ['toWarehouseId'],
  });
type FormValues = z.infer<typeof schema>;

const EMPTY_VALUES: FormValues = { fromWarehouseId: '', toWarehouseId: '', sku: '', quantity: 1 };

export interface InitiateTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefills the source warehouse when opened from a specific warehouse's own context — mirrors `AdjustStockDialog`'s `initialWarehouseId`. */
  initialFromWarehouseId?: string;
}

/** Debounces a fast-changing value (keystrokes) before it drives a network lookup — duplicated locally rather than shared, matching `AdjustStockDialog`'s own precedent (this module's established "own its own copy" convention for small utilities). */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * "Start transfer" — `POST /stock-transfers`, `inventory.transfers.manage`.
 * Places a hold against the source warehouse's stock immediately (the
 * transfer is created `pending`); the destination isn't touched until a
 * separate Complete action runs. Leads with the same Available/On hand/
 * Reserved context at the source the Reserve Stock dialog established in
 * Slice 2's own UX refinement pass — applied here from the start rather
 * than waiting to redo this dialog later — so the quantity field is read
 * against real context, not in isolation.
 */
export function InitiateTransferDialog({ open, onOpenChange, initialFromWarehouseId }: InitiateTransferDialogProps) {
  const { data: warehouses } = useAllWarehouses('active');
  const initiateMutation = useInitiateStockTransfer();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...EMPTY_VALUES, fromWarehouseId: initialFromWarehouseId ?? '' },
  });

  useEffect(() => {
    if (open) reset({ ...EMPTY_VALUES, fromWarehouseId: initialFromWarehouseId ?? '' });
    setFormError(null);
  }, [open, initialFromWarehouseId, reset]);

  const warehouseOptions = (warehouses ?? []).map((w) => ({ value: w.id, label: `${w.name} (${w.code})` }));

  const watchedFromWarehouseId = watch('fromWarehouseId');
  const watchedSku = watch('sku');
  const watchedQuantity = watch('quantity');
  const debouncedSku = useDebouncedValue(watchedSku, 400);
  const { data: matchedProduct, isFetching: isMatching } = useCatalogProductBySku(debouncedSku);

  // Current stock at the source — the exact warehouse+SKU StockItem, if one
  // already exists. No match is a legitimate answer ("nothing recorded
  // there yet" — and therefore nothing to transfer), rendered honestly.
  const { data: currentStockResult, isFetching: isLoadingCurrent } = useCurrentStockItem(watchedFromWarehouseId || undefined, debouncedSku || undefined);
  const sourceItem = currentStockResult?.data[0];
  const showSourceContext = Boolean(watchedFromWarehouseId && debouncedSku && !isLoadingCurrent);
  const sourceAvailable = sourceItem?.quantityAvailable ?? 0;

  const quantity = Number.isFinite(watchedQuantity) && watchedQuantity > 0 ? Math.trunc(watchedQuantity) : 0;
  const remainingAtSource = sourceAvailable - quantity;
  const wouldExceedAvailable = showSourceContext && quantity > 0 && quantity > sourceAvailable;

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    try {
      await initiateMutation.mutateAsync(values);
      toast({ variant: 'success', title: 'Transfer started', description: `${values.quantity} unit${values.quantity === 1 ? '' : 's'} of ${values.sku} on the way.` });
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      setFormError(inventoryErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Start transfer</DialogTitle>
          <DialogDescription>Move stock from one warehouse to another — reduces the source&rsquo;s Available immediately; On hand moves once the transfer is completed.</DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Controller
            control={control}
            name="fromWarehouseId"
            render={({ field }) => (
              <Select
                label="Source warehouse"
                value={field.value}
                onValueChange={field.onChange}
                options={warehouseOptions}
                placeholder={warehouseOptions.length === 0 ? 'No warehouses yet' : 'Where is stock moving from?'}
                disabled={warehouseOptions.length === 0}
                error={errors.fromWarehouseId?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="toWarehouseId"
            render={({ field }) => (
              <Select
                label="Destination warehouse"
                value={field.value}
                onValueChange={field.onChange}
                options={warehouseOptions}
                placeholder={warehouseOptions.length === 0 ? 'No warehouses yet' : 'Where is it moving to?'}
                disabled={warehouseOptions.length === 0}
                error={errors.toWarehouseId?.message}
              />
            )}
          />

          <div>
            <Input label="SKU" error={errors.sku?.message} {...register('sku')} />
            <Text variant="caption" className="mt-1 text-text-secondary" role="status">
              {!watchedSku.trim()
                ? 'Matches a Catalog product automatically as you type.'
                : isMatching
                  ? 'Checking Catalog…'
                  : matchedProduct
                    ? `Matches: ${matchedProduct.name}`
                    : "No matching Catalog product — you can still transfer this SKU."}
            </Text>
          </div>

          {showSourceContext && (
            <dl className="grid grid-cols-3 divide-x divide-border rounded-md border border-border bg-surface-subtle/40">
              <div className="flex flex-col items-center gap-0.5 px-2 py-3">
                <Text as="dt" variant="caption" className="text-text-secondary">
                  Available
                </Text>
                <Text as="dd" variant="stat" className="m-0 tabular-nums">
                  {sourceItem ? sourceAvailable : 0}
                </Text>
                {!sourceItem && (
                  <Text as="dd" variant="caption" className="m-0 text-text-secondary">
                    Not tracked here
                  </Text>
                )}
              </div>
              <div className="flex flex-col items-center gap-0.5 px-2 py-3">
                <Text as="dt" variant="caption" className="text-text-secondary">
                  On hand
                </Text>
                <Text as="dd" variant="stat" className="m-0 tabular-nums">
                  {sourceItem?.quantityOnHand ?? 0}
                </Text>
              </div>
              <div className="flex flex-col items-center gap-0.5 px-2 py-3">
                <Text as="dt" variant="caption" className="text-text-secondary">
                  Reserved
                </Text>
                <Text as="dd" variant="stat" className="m-0 tabular-nums">
                  {sourceItem?.quantityReserved ?? 0}
                </Text>
              </div>
            </dl>
          )}

          <div>
            <Input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              label="Quantity to transfer"
              error={errors.quantity?.message}
              {...register('quantity', { valueAsNumber: true })}
            />
            {showSourceContext && quantity > 0 && !wouldExceedAvailable && (
              <Text variant="caption" className="mt-1.5 text-text-secondary" role="status">
                {remainingAtSource} will remain Available at the source after this transfer.
              </Text>
            )}
            {wouldExceedAvailable && !formError && (
              <Alert variant="warning" className="mt-1.5">
                Only {sourceAvailable} Available at the source — the server will reject a transfer of {quantity}. Lower the quantity.
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={warehouseOptions.length === 0}>
              Start transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
