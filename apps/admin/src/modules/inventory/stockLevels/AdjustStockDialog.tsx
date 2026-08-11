import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Minus } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Select,
  SegmentedControl,
  Alert,
  Text,
  useToast,
} from '@nexgen/ui';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { inventoryErrorMessage } from '../shared/errors.js';
import { useCatalogProductBySku } from '../shared/catalogLookup.js';
import { useAllWarehouses } from '../warehouses/queries.js';
import { useAdjustStock, useCurrentStockItem } from './queries.js';

/** Common merchant-facing reasons — feed the same free-text `reason` field `AdjustStockRequest` already accepts (apps/backend); not a new backend enum, just a shortcut to it. */
const REASON_PRESETS = [
  { value: 'received_shipment', label: 'Received shipment' },
  { value: 'stocktake_correction', label: 'Stocktake correction' },
  { value: 'damaged', label: 'Damaged / written off' },
  { value: 'customer_return', label: 'Customer return' },
  { value: 'other', label: 'Other (specify)' },
] as const;
const REASON_LABEL_BY_VALUE = new Map<string, string>(REASON_PRESETS.map((p) => [p.value, p.label]));

const schema = z
  .object({
    warehouseId: z.string().min(1, 'Choose a warehouse'),
    sku: z.string().min(1, 'SKU is required').max(100),
    direction: z.enum(['add', 'remove']),
    magnitude: z.coerce.number().int('Whole numbers only').positive('Enter a quantity greater than zero'),
    reasonPreset: z.string().min(1),
    reasonOther: z.string().max(255).optional().or(z.literal('')),
  })
  .refine((v) => v.reasonPreset !== 'other' || Boolean(v.reasonOther?.trim()), {
    message: 'Enter a reason',
    path: ['reasonOther'],
  });
type FormValues = z.infer<typeof schema>;

export interface AdjustStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefills the form when opened from a specific Stock Levels row; omitted when opened from the page's own "Adjust stock" toolbar button. */
  initialWarehouseId?: string;
  initialSku?: string;
}

function defaultValues(warehouseId?: string, sku?: string): FormValues {
  return { warehouseId: warehouseId ?? '', sku: sku ?? '', direction: 'add', magnitude: 1, reasonPreset: 'received_shipment', reasonOther: '' };
}

/** Debounces a fast-changing value (keystrokes) before it drives a network lookup — a small, local concern; this module has no shared debounce utility yet and one keystroke-per-request would be wasteful for the Catalog SKU-match lookup below. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Manual Stock Adjustment (Slice 1, UX refinement pass) — `inventory.stock.manage`, `POST /stock-items/adjust`. */
export function AdjustStockDialog({ open, onOpenChange, initialWarehouseId, initialSku }: AdjustStockDialogProps) {
  const { data: warehouses } = useAllWarehouses('active');
  const adjustMutation = useAdjustStock();
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
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaultValues(initialWarehouseId, initialSku) });

  useEffect(() => {
    if (open) reset(defaultValues(initialWarehouseId, initialSku));
    setFormError(null);
  }, [open, initialWarehouseId, initialSku, reset]);

  const warehouseOptions = useMemo(() => (warehouses ?? []).map((w) => ({ value: w.id, label: `${w.name} (${w.code})` })), [warehouses]);

  const watchedWarehouseId = watch('warehouseId');
  const watchedSku = watch('sku');
  const watchedDirection = watch('direction');
  const watchedMagnitude = watch('magnitude');
  const watchedReasonPreset = watch('reasonPreset');
  const debouncedSku = useDebouncedValue(watchedSku, 400);
  const { data: matchedProduct, isFetching: isMatching } = useCatalogProductBySku(debouncedSku);

  // "Current stock" preview — the exact warehouse+SKU StockItem, if one
  // already exists. No match is a legitimate answer ("never recorded here
  // yet"), rendered as a real 0, not an error.
  const { data: currentStockResult, isFetching: isLoadingCurrent } = useCurrentStockItem(watchedWarehouseId || undefined, debouncedSku || undefined);
  const currentItem = currentStockResult?.data[0];
  const currentOnHand = currentItem?.quantityOnHand ?? 0;
  const isNewRecord = Boolean(watchedWarehouseId && debouncedSku && !isLoadingCurrent && !currentItem);

  const magnitude = Number.isFinite(watchedMagnitude) && watchedMagnitude > 0 ? Math.trunc(watchedMagnitude) : 0;
  const signedDelta = watchedDirection === 'remove' ? -magnitude : magnitude;
  const expectedOnHand = currentOnHand + signedDelta;
  const wouldOversell = expectedOnHand < 0;
  const showPreview = Boolean(watchedWarehouseId && watchedSku.trim());

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    const quantityDelta = values.direction === 'remove' ? -values.magnitude : values.magnitude;
    const reason = values.reasonPreset === 'other' ? values.reasonOther!.trim() : (REASON_LABEL_BY_VALUE.get(values.reasonPreset) ?? values.reasonPreset);
    try {
      const result = await adjustMutation.mutateAsync({ warehouseId: values.warehouseId, sku: values.sku, quantityDelta, reason });
      toast({
        variant: 'success',
        title: 'Stock adjusted',
        description: `${values.sku} now has ${result.quantityOnHand} on hand.`,
      });
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
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>Correct an on-hand quantity — receiving stock, a stocktake correction, damage, or a return.</DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Controller
            control={control}
            name="warehouseId"
            render={({ field }) => (
              <Select
                label="Warehouse"
                value={field.value}
                onValueChange={field.onChange}
                options={warehouseOptions}
                placeholder={warehouseOptions.length === 0 ? 'No warehouses yet' : 'Select a warehouse…'}
                disabled={warehouseOptions.length === 0}
                error={errors.warehouseId?.message}
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
                    : "No matching Catalog product — you can still adjust this SKU."}
            </Text>
          </div>

          <div>
            <Text variant="body-strong" className="mb-1.5">
              Quantity change
            </Text>
            <div className="flex items-center gap-3">
              <Controller
                control={control}
                name="direction"
                render={({ field }) => (
                  <SegmentedControl
                    ariaLabel="Add or remove stock"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      { value: 'add', label: 'Add stock', icon: Plus },
                      { value: 'remove', label: 'Remove stock', icon: Minus },
                    ]}
                  />
                )}
              />
              <Input
                type="number"
                min={1}
                step={1}
                aria-label="Quantity"
                className="w-32"
                error={errors.magnitude?.message}
                {...register('magnitude', { valueAsNumber: true })}
              />
            </div>
            {errors.magnitude?.message && (
              <Text variant="caption" className="mt-1 text-feedback-danger">
                {errors.magnitude.message}
              </Text>
            )}
          </div>

          {/* Current → Adjustment → Expected — the merchant sees the real effect of this
              change before submitting, computed from the real on-hand value already
              fetched above; the server's own row-locked check remains the sole
              authority on whether the write actually succeeds. */}
          {showPreview && (
            <div className="grid grid-cols-3 divide-x divide-border rounded-md border border-border bg-surface-subtle/40">
              <div className="flex flex-col items-center gap-0.5 px-2 py-3">
                <Text variant="caption" className="text-text-secondary">
                  Current
                </Text>
                <Text variant="subheading" className="tabular-nums">
                  {isLoadingCurrent ? '…' : currentOnHand}
                </Text>
                {isNewRecord && (
                  <Text variant="caption" className="text-text-secondary">
                    New record
                  </Text>
                )}
              </div>
              <div className="flex flex-col items-center gap-0.5 px-2 py-3">
                <Text variant="caption" className="text-text-secondary">
                  Adjustment
                </Text>
                <Text variant="subheading" className={`tabular-nums ${signedDelta >= 0 ? 'text-feedback-success' : 'text-feedback-danger'}`}>
                  {signedDelta >= 0 ? '+' : ''}
                  {signedDelta}
                </Text>
              </div>
              <div className="flex flex-col items-center gap-0.5 px-2 py-3">
                <Text variant="caption" className="text-text-secondary">
                  Expected
                </Text>
                <Text variant="subheading" className={`tabular-nums ${wouldOversell ? 'text-feedback-danger' : ''}`}>
                  {expectedOnHand}
                </Text>
              </div>
            </div>
          )}
          {showPreview && wouldOversell && (
            <Alert variant="warning">
              This would take on-hand below zero — the server will reject it. Lower the quantity or double-check the warehouse and SKU.
            </Alert>
          )}

          <Controller
            control={control}
            name="reasonPreset"
            render={({ field }) => <Select label="Reason" value={field.value} onValueChange={field.onChange} options={[...REASON_PRESETS]} />}
          />
          {watchedReasonPreset === 'other' && (
            <Input label="Specify reason" error={errors.reasonOther?.message} {...register('reasonOther')} />
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={warehouseOptions.length === 0}>
              Adjust stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
