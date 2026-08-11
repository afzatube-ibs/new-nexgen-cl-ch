import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Checkbox,
  Alert,
  Text,
  useToast,
} from '@nexgen/ui';
import { ConflictError, type WarehouseDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { useCreateWarehouse, useUpdateWarehouse } from './queries.js';

const schema = z.object({
  code: z.string().min(1, 'Code is required').max(100),
  name: z.string().min(1, 'Name is required').max(255),
  addressLine1: z.string().max(255).optional().or(z.literal('')),
  addressLine2: z.string().max(255).optional().or(z.literal('')),
  city: z.string().max(255).optional().or(z.literal('')),
  region: z.string().max(255).optional().or(z.literal('')),
  postalCode: z.string().max(50).optional().or(z.literal('')),
  /** Uppercased on submit, not here — `WarehouseController`'s own `regex:/^[A-Z]{2}$/` stays the single source of truth for the exact rule; a merchant typing "us" shouldn't see a client-side rejection for a case difference the server will happily accept once normalized. */
  countryCode: z.string().max(2).optional().or(z.literal('')),
  isDefault: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export interface WarehouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit; absent for create. */
  warehouse?: WarehouseDTO;
}

const EMPTY_VALUES: FormValues = {
  code: '',
  name: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  region: '',
  postalCode: '',
  countryCode: '',
  isDefault: false,
};

function valuesFromWarehouse(warehouse?: WarehouseDTO): FormValues {
  if (!warehouse) return EMPTY_VALUES;
  return {
    code: warehouse.code,
    name: warehouse.name,
    addressLine1: warehouse.address.line1 ?? '',
    addressLine2: warehouse.address.line2 ?? '',
    city: warehouse.address.city ?? '',
    region: warehouse.address.region ?? '',
    postalCode: warehouse.address.postalCode ?? '',
    countryCode: warehouse.address.countryCode ?? '',
    isDefault: warehouse.isDefault,
  };
}

/** Create/edit Warehouse — `inventory.warehouses.manage`. */
export function WarehouseFormDialog({ open, onOpenChange, warehouse }: WarehouseFormDialogProps) {
  const isEdit = Boolean(warehouse);
  const createMutation = useCreateWarehouse();
  const updateMutation = useUpdateWarehouse();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFromWarehouse(warehouse) });

  useEffect(() => {
    if (open) reset(valuesFromWarehouse(warehouse));
    setFormError(null);
  }, [open, warehouse, reset]);

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    const input = { ...values, countryCode: values.countryCode ? values.countryCode.toUpperCase() : values.countryCode };
    try {
      if (isEdit && warehouse) {
        await updateMutation.mutateAsync({ id: warehouse.id, input: { ...input, expectedVersion: warehouse.version } });
        toast({ variant: 'success', title: 'Warehouse updated', description: `"${values.name}" has been saved.` });
      } else {
        await createMutation.mutateAsync(input);
        toast({ variant: 'success', title: 'Warehouse created', description: `"${values.name}" is ready to track stock.` });
      }
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      if (error instanceof ConflictError) {
        setFormError('This warehouse was changed elsewhere — close this dialog and try again.');
        return;
      }
      setFormError('Something went wrong. Please try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit warehouse' : 'New warehouse'}</DialogTitle>
          <DialogDescription>{isEdit ? "Update this warehouse's details." : 'Create a new stock-holding location.'}</DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="Code" hint="A short, unique identifier, e.g. MAIN or DHK-01." error={errors.code?.message} {...register('code')} />

          <Text variant="body-strong" className="mt-2">
            Address <span className="text-text-secondary font-normal">(optional)</span>
          </Text>
          <Input label="Address line 1" error={errors.addressLine1?.message} {...register('addressLine1')} />
          <Input label="Address line 2" error={errors.addressLine2?.message} {...register('addressLine2')} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="City" error={errors.city?.message} {...register('city')} />
            <Input label="Region / State" error={errors.region?.message} {...register('region')} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Postal code" error={errors.postalCode?.message} {...register('postalCode')} />
            <Input label="Country code" hint="Two letters, e.g. US, BD." maxLength={2} error={errors.countryCode?.message} {...register('countryCode')} />
          </div>

          <div>
            <Controller
              control={control}
              name="isDefault"
              render={({ field }) => (
                <Checkbox label="Default warehouse" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
              )}
            />
            <Text variant="caption" className="mt-1 text-text-secondary">
              Stock adjustments default here when no other warehouse is chosen. Setting this unsets any other default automatically.
            </Text>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create warehouse'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
