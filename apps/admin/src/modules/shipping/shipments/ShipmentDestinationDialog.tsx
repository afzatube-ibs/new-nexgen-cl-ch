import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Alert, useToast } from '@nexgen/ui';
import type { ShipmentDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { shippingErrorMessage } from '../shared/errors.js';
import { useSetShipmentDestination } from './queries.js';

const schema = z.object({
  recipientName: z.string().min(1, 'Recipient name is required').max(255),
  phone: z.string().min(1, 'Phone is required').max(30),
  addressLine1: z.string().min(1, 'Address line 1 is required').max(255),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(1, 'City is required').max(100),
  region: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  countryCode: z.string().length(2, 'Enter a 2-letter country code, e.g. BD'),
  weightGrams: z.coerce.number().int('Whole grams only').min(1, 'Must be at least 1 gram').optional().or(z.literal('').transform(() => undefined)),
});
type FormValues = z.infer<typeof schema>;

export interface ShipmentDestinationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: ShipmentDTO;
}

function valuesFromShipment(shipment: ShipmentDTO): FormValues {
  const d = shipment.destination;
  return {
    recipientName: d.recipientName ?? '',
    phone: d.phone ?? '',
    addressLine1: d.addressLine1 ?? '',
    addressLine2: d.addressLine2 ?? '',
    city: d.city ?? '',
    region: d.region ?? '',
    postalCode: d.postalCode ?? '',
    countryCode: d.countryCode ?? '',
    weightGrams: shipment.weightGrams ?? undefined,
  };
}

/**
 * `SetShipmentDestinationAction` — `fulfillment.shipments.manage`. One
 * dialog covers both the destination address AND the parcel weight
 * deliberately, not two separate UIs: they are the exact same real
 * endpoint (`PATCH .../destination`), and `SetShipmentDestinationRequest`
 * requires the core address fields (`recipient_name`/`phone`/
 * `address_line1`/`city`/`country_code`) on every single call — there is no
 * dedicated weight-only endpoint (confirmed by reading
 * `SetShipmentDestinationAction`'s own `TRACKED_FIELDS` directly). Building
 * a separate "Weight editor" against the same endpoint would mean silently
 * resending the operator's last-known address every time they only meant to
 * adjust weight — this form makes that explicit instead. Blocked by the
 * real backend once dispatched/in_transit/delivered/failed/cancelled
 * (`already_dispatched`) — the caller only renders the trigger before that.
 */
export function ShipmentDestinationDialog({ open, onOpenChange, shipment }: ShipmentDestinationDialogProps) {
  const { toast } = useToast();
  const setDestinationMutation = useSetShipmentDestination();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFromShipment(shipment) });

  useEffect(() => {
    if (open) reset(valuesFromShipment(shipment));
    setFormError(null);
  }, [open, shipment, reset]);

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    try {
      await setDestinationMutation.mutateAsync({
        id: shipment.id,
        input: {
          recipientName: values.recipientName,
          phone: values.phone,
          addressLine1: values.addressLine1,
          addressLine2: values.addressLine2?.trim() || null,
          city: values.city,
          region: values.region?.trim() || null,
          postalCode: values.postalCode?.trim() || null,
          countryCode: values.countryCode.toUpperCase(),
          weightGrams: values.weightGrams ?? null,
          expectedVersion: shipment.version,
        },
      });
      toast({ variant: 'success', title: 'Destination saved' });
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
          <DialogTitle>{shipment.destination.recipientName ? 'Edit destination & weight' : 'Set destination & weight'}</DialogTitle>
          <DialogDescription>The delivery address and parcel weight — required before this shipment can be dispatched or marked packed.</DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-2" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Recipient name" error={errors.recipientName?.message} {...register('recipientName')} />
          <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
          <Input label="Address line 1" error={errors.addressLine1?.message} {...register('addressLine1')} />
          <Input label="Address line 2" hint="Optional." error={errors.addressLine2?.message} {...register('addressLine2')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" error={errors.city?.message} {...register('city')} />
            <Input label="Region" hint="Optional." error={errors.region?.message} {...register('region')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Postal code" hint="Optional." error={errors.postalCode?.message} {...register('postalCode')} />
            <Input label="Country" hint="2-letter ISO code, e.g. BD." maxLength={2} className="uppercase" error={errors.countryCode?.message} {...register('countryCode')} />
          </div>
          <Input type="number" min={1} step="1" label="Weight (grams)" hint="Optional — required before this shipment can be marked packed." error={errors.weightGrams?.message} {...register('weightGrams')} />

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
