import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Checkbox, Alert, useToast } from '@nexgen/ui';
import type { CustomerDTO, CustomerAddressDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { customersErrorMessage } from '../shared/errors.js';
import { useAddCustomerAddress, useUpdateCustomerAddress } from '../shared/queries.js';

const schema = z.object({
  label: z.string().max(100).optional(),
  recipientName: z.string().min(1, 'Recipient name is required').max(255),
  phone: z.string().max(50).optional(),
  addressLine1: z.string().min(1, 'Address is required').max(255),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(1, 'City is required').max(255),
  region: z.string().max(255).optional(),
  postalCode: z.string().max(50).optional(),
  // Length-checked here only, matching Pricing's own Tax Zone country-code
  // field precedent — the server's own `regex:/^[A-Z]{2}$/i` rule accepts
  // either case.
  countryCode: z.string().length(2, 'Enter a 2-letter country code, e.g. US'),
  isDefaultShipping: z.boolean(),
  isDefaultBilling: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export interface CustomerAddressFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerDTO;
  /** Present for edit; absent for create. */
  address?: CustomerAddressDTO;
}

const EMPTY_VALUES: FormValues = {
  label: '',
  recipientName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  region: '',
  postalCode: '',
  countryCode: '',
  isDefaultShipping: false,
  isDefaultBilling: false,
};

function valuesFromAddress(address?: CustomerAddressDTO): FormValues {
  if (!address) return EMPTY_VALUES;
  return {
    label: address.label ?? '',
    recipientName: address.recipientName,
    phone: address.phone ?? '',
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? '',
    city: address.city,
    region: address.region ?? '',
    postalCode: address.postalCode ?? '',
    countryCode: address.countryCode,
    isDefaultShipping: address.isDefaultShipping,
    isDefaultBilling: address.isDefaultBilling,
  };
}

/**
 * Add/edit one entry in a Customer's address book — `customers.customers.
 * manage`. Every mutation here takes the *Customer's own* `expected_version`
 * (addresses carry no `lock_version` of their own — Customer and its
 * address book are one aggregate, per `AddCustomerAddressAction`'s own
 * docblock), so a stale customer record blocks this the same way editing
 * the profile itself would.
 *
 * Checking "Default shipping"/"Default billing" here demotes whichever
 * other address in this book currently holds that flag — server-enforced
 * (`AddCustomerAddressAction`/`UpdateCustomerAddressAction`'s own
 * transactional invariant), not re-derived client-side; this dialog just
 * reflects the checkbox state the merchant sets.
 */
export function CustomerAddressFormDialog({ open, onOpenChange, customer, address }: CustomerAddressFormDialogProps) {
  const isEdit = Boolean(address);
  const addMutation = useAddCustomerAddress(customer.id);
  const updateMutation = useUpdateCustomerAddress(customer.id);
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFromAddress(address) });

  useEffect(() => {
    if (open) reset(valuesFromAddress(address));
    setFormError(null);
  }, [open, address, reset]);

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    const countryCode = values.countryCode.toUpperCase();
    try {
      if (isEdit && address) {
        await updateMutation.mutateAsync({
          addressId: address.id,
          input: {
            label: values.label || null,
            recipientName: values.recipientName,
            phone: values.phone || null,
            addressLine1: values.addressLine1,
            addressLine2: values.addressLine2 || null,
            city: values.city,
            region: values.region || null,
            postalCode: values.postalCode || null,
            countryCode,
            isDefaultShipping: values.isDefaultShipping,
            isDefaultBilling: values.isDefaultBilling,
            expectedVersion: customer.version,
          },
        });
        toast({ variant: 'success', title: 'Address updated' });
      } else {
        await addMutation.mutateAsync({
          label: values.label || null,
          recipientName: values.recipientName,
          phone: values.phone || null,
          addressLine1: values.addressLine1,
          addressLine2: values.addressLine2 || null,
          city: values.city,
          region: values.region || null,
          postalCode: values.postalCode || null,
          countryCode,
          isDefaultShipping: values.isDefaultShipping,
          isDefaultBilling: values.isDefaultBilling,
          expectedVersion: customer.version,
        });
        toast({ variant: 'success', title: 'Address added' });
      }
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      setFormError(customersErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        `max-h-[85vh] overflow-y-auto` — the shared `DialogContent` has no
        height/scroll constraint of its own (confirmed by reading
        `packages/ui/src/components/Dialog/Dialog.tsx` directly: `fixed
        ... -translate-y-1/2` with no `max-h`/`overflow`), so a genuinely
        tall form like this one's 9 fields + 2 checkboxes can render with
        its own Save button below the viewport, permanently unreachable —
        live-reproduced during this slice's own Playwright verification.
        `packages/ui` is explicitly frozen for this slice ("Do NOT modify
        Shared UI Foundation"), so this is fixed at the one place a
        consumer is already meant to extend it — the `className` prop
        `DialogContent` already merges via `cn()` — not by editing the
        shared component itself. */}
      <DialogContent size="md" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit address' : 'Add address'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update this address.' : "Add an entry to this customer's address book."}</DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Label" hint="Optional — e.g. Home, Office." error={errors.label?.message} {...register('label')} />
          <Input label="Recipient name" error={errors.recipientName?.message} {...register('recipientName')} />
          <Input label="Phone" hint="Optional." error={errors.phone?.message} {...register('phone')} />
          <Input label="Address line 1" error={errors.addressLine1?.message} {...register('addressLine1')} />
          <Input label="Address line 2" hint="Optional." error={errors.addressLine2?.message} {...register('addressLine2')} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="City" error={errors.city?.message} {...register('city')} />
            <Input label="Region" hint="Optional — state/province." error={errors.region?.message} {...register('region')} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Postal code" hint="Optional." error={errors.postalCode?.message} {...register('postalCode')} />
            <Input
              label="Country"
              hint="Two-letter ISO code, e.g. US, GB, DE."
              maxLength={2}
              className="uppercase"
              error={errors.countryCode?.message}
              {...register('countryCode')}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Controller
              control={control}
              name="isDefaultShipping"
              render={({ field }) => (
                <Checkbox label="Default shipping address" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
              )}
            />
            <Controller
              control={control}
              name="isDefaultBilling"
              render={({ field }) => (
                <Checkbox label="Default billing address" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
              )}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Add address'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
