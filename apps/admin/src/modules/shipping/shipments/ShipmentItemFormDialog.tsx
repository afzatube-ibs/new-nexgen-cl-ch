import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Alert, useToast } from '@nexgen/ui';
import type { ShipmentDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { shippingErrorMessage } from '../shared/errors.js';
import { useAddShipmentItem } from './queries.js';

const schema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100),
  description: z.string().max(500).optional(),
  quantity: z.coerce.number().int('Whole numbers only').min(1, 'Must be at least 1'),
});
type FormValues = z.infer<typeof schema>;

export interface ShipmentItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: ShipmentDTO;
}

const EMPTY_VALUES: FormValues = { sku: '', description: '', quantity: 1 };

/**
 * `AddShipmentItemAction` — `fulfillment.shipments.manage`. `sku` is a
 * plain string, never validated against Catalog (confirmed via
 * `ShipmentItem`'s own docblock) — no live product lookup is offered here,
 * matching that honest, un-invented shape exactly. Only reachable while the
 * caller's own status check allows it (blocked once genuinely `packed` or
 * later — see `ShipmentDetailPage`'s own gating).
 */
export function ShipmentItemFormDialog({ open, onOpenChange, shipment }: ShipmentItemFormDialogProps) {
  const { toast } = useToast();
  const addItemMutation = useAddShipmentItem();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_VALUES });

  useEffect(() => {
    if (open) reset(EMPTY_VALUES);
    setFormError(null);
  }, [open, reset]);

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    try {
      await addItemMutation.mutateAsync({ id: shipment.id, input: { sku: values.sku, description: values.description?.trim() || null, quantity: values.quantity } });
      toast({ variant: 'success', title: 'Item added' });
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      setFormError(shippingErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Add item</DialogTitle>
          <DialogDescription>A line item to be picked and packed for this shipment.</DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-2" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="SKU" error={errors.sku?.message} {...register('sku')} />
          <Input label="Description" hint="Optional." error={errors.description?.message} {...register('description')} />
          <Input type="number" min={1} step="1" label="Quantity" error={errors.quantity?.message} {...register('quantity')} />

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Add item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
