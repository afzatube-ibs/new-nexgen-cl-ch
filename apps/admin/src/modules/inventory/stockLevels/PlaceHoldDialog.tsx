import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Alert, Text, useToast } from '@nexgen/ui';
import type { StockItemDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { inventoryErrorMessage } from '../shared/errors.js';
import { MANUAL_HOLD_REFERENCE_TYPE } from '../shared/reservationLabel.js';
import { useReserveStock } from './queries.js';

const schema = z.object({
  quantity: z.coerce.number().int('Whole numbers only').positive('Enter a quantity greater than zero'),
  reference: z.string().max(255).optional().or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

const EMPTY_VALUES: FormValues = { quantity: 1, reference: '' };

export interface PlaceHoldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockItem: StockItemDTO;
}

/**
 * "Reserve stock" — `POST /stock-items/{id}/reservations`,
 * `inventory.reservations.manage`. The pre-Checkout merchant workflow the
 * architecture doc names explicitly (§4.5): holding stock for an offline/
 * phone order. No warehouse/SKU picker — this always opens from a specific
 * StockItem's own detail drawer, so both are already known. `reference_type`
 * is always sent as the fixed `MANUAL_HOLD_REFERENCE_TYPE` literal so a
 * future system-created reservation (e.g. from Checkout) stays visually
 * distinguishable from one a merchant placed by hand.
 *
 * UX refinement pass: leads with the same Available/On hand/Reserved context
 * the drawer just showed (merchants shouldn't have to remember or scroll back
 * to see it) so the quantity field is read *against* that context rather than
 * in isolation — the quantity itself is the last thing decided, not the
 * first thing seen. The oversell check mirrors `AdjustStockDialog`'s own
 * non-blocking preview: warn early from data already on hand, but let the
 * server's row-locked check remain the sole authority on whether the write
 * actually succeeds (never duplicate that business rule client-side).
 */
export function PlaceHoldDialog({ open, onOpenChange, stockItem }: PlaceHoldDialogProps) {
  const reserveMutation = useReserveStock(stockItem.id);
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_VALUES });

  useEffect(() => {
    if (open) reset(EMPTY_VALUES);
    setFormError(null);
  }, [open, reset]);

  const watchedQuantity = watch('quantity');
  const quantity = Number.isFinite(watchedQuantity) && watchedQuantity > 0 ? Math.trunc(watchedQuantity) : 0;
  const remainingAvailable = stockItem.quantityAvailable - quantity;
  const wouldExceedAvailable = quantity > 0 && quantity > stockItem.quantityAvailable;

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    try {
      await reserveMutation.mutateAsync({
        quantity: values.quantity,
        referenceType: MANUAL_HOLD_REFERENCE_TYPE,
        referenceId: values.reference?.trim() || null,
      });
      toast({ variant: 'success', title: 'Stock reserved', description: `${values.quantity} unit${values.quantity === 1 ? '' : 's'} of ${stockItem.sku} reserved.` });
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
          <DialogTitle>Reserve stock</DialogTitle>
          <DialogDescription>
            Hold stock of <strong>{stockItem.sku}</strong> for an offline order — reduces what&rsquo;s Available without changing On hand.
          </DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}

        {/* Current stock context, read before the quantity field — same
            three numbers the drawer just showed, so the merchant reserves
            against what they already saw rather than a number in isolation. */}
        <dl className="mb-4 grid grid-cols-3 divide-x divide-border rounded-md border border-border bg-surface-subtle/40">
          <div className="flex flex-col items-center gap-0.5 px-2 py-3">
            <Text as="dt" variant="caption" className="text-text-secondary">
              Available
            </Text>
            <Text as="dd" variant="stat" className="m-0 tabular-nums">
              {stockItem.quantityAvailable}
            </Text>
          </div>
          <div className="flex flex-col items-center gap-0.5 px-2 py-3">
            <Text as="dt" variant="caption" className="text-text-secondary">
              On hand
            </Text>
            <Text as="dd" variant="stat" className="m-0 tabular-nums">
              {stockItem.quantityOnHand}
            </Text>
          </div>
          <div className="flex flex-col items-center gap-0.5 px-2 py-3">
            <Text as="dt" variant="caption" className="text-text-secondary">
              Reserved
            </Text>
            <Text as="dd" variant="stat" className="m-0 tabular-nums">
              {stockItem.quantityReserved}
            </Text>
          </div>
        </dl>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div>
            <Input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              label="Quantity to reserve"
              hint="How many units to hold. On hand stays the same — only what's Available goes down."
              error={errors.quantity?.message}
              {...register('quantity', { valueAsNumber: true })}
            />
            {quantity > 0 && !wouldExceedAvailable && (
              <Text variant="caption" className="mt-1.5 text-text-secondary" role="status">
                {remainingAvailable} will remain Available after this reservation.
              </Text>
            )}
            {/* Suppressed once the real server error is showing (below, as
                `formError`) — that's the authoritative answer once a submit
                has actually been attempted; this early warning would only
                repeat it in slightly different words. */}
            {wouldExceedAvailable && !formError && (
              <Alert variant="warning" className="mt-1.5">
                Only {stockItem.quantityAvailable} Available — the server will reject a reservation of {quantity}. Lower the quantity.
              </Alert>
            )}
          </div>

          <Input
            label="Reference"
            hint="Optional — e.g. an offline order number, customer name, phone number, or internal reference."
            placeholder="e.g. Offline order #1042"
            error={errors.reference?.message}
            {...register('reference')}
          />

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Reserve stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
