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
  Textarea,
  Select,
  Checkbox,
  Alert,
} from '@nexgen/ui';
import { ConflictError, type PromotionDTO } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../../framework/index.js';
import { formatDecimal } from '../shared/formatDecimal.js';
import { useCreatePromotion, useUpdatePromotion } from './queries.js';

/**
 * Mirrors `CreatePromotionRequest`'s own `withValidator` rule set exactly
 * (`apps/backend/.../Promotions/Http/Requests/CreatePromotionRequest.php`):
 * percentage/fixed_amount require a discount value; fixed_amount also
 * requires a currency code; buy_x_get_y requires its own quantity/discount
 * fields. Never a simplified client-side approximation of the server's
 * own rule — the same conditional-requirement shape, client-side, so a
 * merchant sees the exact same error before submitting, not after.
 */
const promotionSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().optional().or(z.literal('')),
    discountType: z.enum(['percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping']),
    discountValue: z.string().optional().or(z.literal('')),
    currencyCode: z.string().max(3).optional().or(z.literal('')),
    buyXQuantity: z.string().optional().or(z.literal('')),
    getYQuantity: z.string().optional().or(z.literal('')),
    getYDiscountPercentage: z.string().optional().or(z.literal('')),
    isStackable: z.boolean(),
    priority: z.string().optional().or(z.literal('')),
    requiresCoupon: z.boolean(),
    startsAt: z.string().optional().or(z.literal('')),
    endsAt: z.string().optional().or(z.literal('')),
    usageLimitGlobal: z.string().optional().or(z.literal('')),
    usageLimitPerCustomer: z.string().optional().or(z.literal('')),
  })
  .superRefine((values, ctx) => {
    if ((values.discountType === 'percentage' || values.discountType === 'fixed_amount') && !values.discountValue) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discountValue'], message: 'This discount type requires a discount value.' });
    }
    if (values.discountType === 'fixed_amount' && !values.currencyCode) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['currencyCode'], message: 'A fixed-amount promotion requires a currency code.' });
    }
    if (values.discountType === 'buy_x_get_y') {
      if (!values.buyXQuantity) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['buyXQuantity'], message: 'Required for buy-X-get-Y.' });
      if (!values.getYQuantity) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['getYQuantity'], message: 'Required for buy-X-get-Y.' });
      if (!values.getYDiscountPercentage)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['getYDiscountPercentage'], message: 'Required for buy-X-get-Y.' });
    }
    if (values.endsAt && values.startsAt && values.endsAt <= values.startsAt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'Must be after the start date.' });
    }
  });
type PromotionFormValues = z.infer<typeof promotionSchema>;

export interface PromotionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit; absent for create. */
  promotion?: PromotionDTO;
}

const EMPTY_VALUES: PromotionFormValues = {
  name: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  currencyCode: '',
  buyXQuantity: '',
  getYQuantity: '',
  getYDiscountPercentage: '',
  isStackable: false,
  priority: '0',
  requiresCoupon: false,
  startsAt: '',
  endsAt: '',
  usageLimitGlobal: '',
  usageLimitPerCustomer: '',
};

function valuesFromPromotion(promotion?: PromotionDTO): PromotionFormValues {
  if (!promotion) return EMPTY_VALUES;
  return {
    name: promotion.name,
    description: promotion.description ?? '',
    discountType: promotion.discountType,
    discountValue: promotion.discountValue ? formatDecimal(promotion.discountValue) : '',
    currencyCode: promotion.currencyCode ?? '',
    buyXQuantity: promotion.buyXQuantity != null ? String(promotion.buyXQuantity) : '',
    getYQuantity: promotion.getYQuantity != null ? String(promotion.getYQuantity) : '',
    getYDiscountPercentage: promotion.getYDiscountPercentage ? formatDecimal(promotion.getYDiscountPercentage) : '',
    isStackable: promotion.isStackable,
    priority: String(promotion.priority),
    requiresCoupon: promotion.requiresCoupon,
    startsAt: promotion.startsAt ? promotion.startsAt.slice(0, 16) : '',
    endsAt: promotion.endsAt ? promotion.endsAt.slice(0, 16) : '',
    usageLimitGlobal: promotion.usageLimitGlobal != null ? String(promotion.usageLimitGlobal) : '',
    usageLimitPerCustomer: promotion.usageLimitPerCustomer != null ? String(promotion.usageLimitPerCustomer) : '',
  };
}

function toNumberOrUndefined(value: string): number | undefined {
  return value ? Number(value) : undefined;
}

/** Create/edit Promotion — `promotions.promotions.manage`. */
export function PromotionFormDialog({ open, onOpenChange, promotion }: PromotionFormDialogProps) {
  const isEdit = Boolean(promotion);
  const createMutation = useCreatePromotion();
  const updateMutation = useUpdatePromotion();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PromotionFormValues>({ resolver: zodResolver(promotionSchema), defaultValues: valuesFromPromotion(promotion) });

  const discountType = watch('discountType');

  useEffect(() => {
    if (open) reset(valuesFromPromotion(promotion));
    setFormError(null);
  }, [open, promotion, reset]);

  async function onSubmit(values: PromotionFormValues): Promise<void> {
    setFormError(null);
    const input = {
      name: values.name,
      description: values.description || null,
      discountType: values.discountType,
      discountValue: values.discountValue || null,
      currencyCode: values.currencyCode || null,
      buyXQuantity: toNumberOrUndefined(values.buyXQuantity ?? '') ?? null,
      getYQuantity: toNumberOrUndefined(values.getYQuantity ?? '') ?? null,
      getYDiscountPercentage: values.getYDiscountPercentage || null,
      isStackable: values.isStackable,
      priority: toNumberOrUndefined(values.priority ?? '') ?? 0,
      requiresCoupon: values.requiresCoupon,
      startsAt: values.startsAt || null,
      endsAt: values.endsAt || null,
      usageLimitGlobal: toNumberOrUndefined(values.usageLimitGlobal ?? '') ?? null,
      usageLimitPerCustomer: toNumberOrUndefined(values.usageLimitPerCustomer ?? '') ?? null,
    };
    try {
      if (isEdit && promotion) {
        await updateMutation.mutateAsync({ id: promotion.id, input: { ...input, expectedVersion: promotion.version } });
      } else {
        await createMutation.mutateAsync(input);
      }
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      if (error instanceof ConflictError) {
        setFormError('This promotion was changed elsewhere — close this dialog and try again.');
        return;
      }
      setFormError('Something went wrong. Please try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit promotion' : 'New promotion'}</DialogTitle>
          <DialogDescription>{isEdit ? "Update this promotion's discount and schedule." : 'Create a new discount rule applied at Checkout.'}</DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Textarea label="Description" error={errors.description?.message} {...register('description')} />
          <Controller
            control={control}
            name="discountType"
            render={({ field }) => (
              <Select
                label="Discount type"
                value={field.value}
                onValueChange={field.onChange}
                options={[
                  { value: 'percentage', label: 'Percentage' },
                  { value: 'fixed_amount', label: 'Fixed amount' },
                  { value: 'buy_x_get_y', label: 'Buy X get Y' },
                  { value: 'free_shipping', label: 'Free shipping' },
                ]}
              />
            )}
          />

          {(discountType === 'percentage' || discountType === 'fixed_amount') && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={discountType === 'percentage' ? 'Discount value (%)' : 'Discount value'}
                type="number"
                step="0.01"
                error={errors.discountValue?.message}
                {...register('discountValue')}
              />
              {discountType === 'fixed_amount' && (
                <Input label="Currency code" placeholder="USD" maxLength={3} error={errors.currencyCode?.message} {...register('currencyCode')} />
              )}
            </div>
          )}

          {discountType === 'buy_x_get_y' && (
            <div className="grid grid-cols-3 gap-4">
              <Input label="Buy X quantity" type="number" error={errors.buyXQuantity?.message} {...register('buyXQuantity')} />
              <Input label="Get Y quantity" type="number" error={errors.getYQuantity?.message} {...register('getYQuantity')} />
              <Input
                label="Get Y discount (%)"
                type="number"
                step="0.01"
                error={errors.getYDiscountPercentage?.message}
                {...register('getYDiscountPercentage')}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Starts at" type="datetime-local" error={errors.startsAt?.message} {...register('startsAt')} />
            <Input label="Ends at" type="datetime-local" error={errors.endsAt?.message} {...register('endsAt')} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="Priority" type="number" hint="Higher applies first." error={errors.priority?.message} {...register('priority')} />
            <Input label="Usage limit (total)" type="number" hint="Leave blank for unlimited." {...register('usageLimitGlobal')} />
            <Input label="Usage limit (per customer)" type="number" hint="Leave blank for unlimited." {...register('usageLimitPerCustomer')} />
          </div>

          <Controller
            control={control}
            name="isStackable"
            render={({ field }) => (
              <Checkbox label="Stackable with other promotions" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
            )}
          />
          <Controller
            control={control}
            name="requiresCoupon"
            render={({ field }) => (
              <Checkbox label="Requires a coupon code" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
            )}
          />

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create promotion'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
