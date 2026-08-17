import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, FlaskConical, BadgeCheck } from 'lucide-react';
import { Button, Input, Card, Text, Alert, Badge } from '@nexgen/ui';
import { PageHeader } from '../../../framework/index.js';
import { evaluatePromotions, type PromotionEvaluationDTO } from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';
import { marketingErrorMessage } from '../shared/errors.js';
import { formatDecimal } from '../shared/formatDecimal.js';

const lineSchema = z.object({
  productId: z.string().min(1, 'Enter a product id'),
  categoryIds: z.string().optional().or(z.literal('')),
  quantity: z.coerce.number({ message: 'Enter a quantity' }).int('Whole numbers only').positive('Enter at least 1'),
  unitPrice: z.coerce.number({ message: 'Enter a unit price' }).min(0, 'Must be 0 or more'),
});

const schema = z.object({
  currencyCode: z.string().length(3, 'Enter a 3-letter currency code, e.g. USD'),
  couponCode: z.string().optional().or(z.literal('')),
  customerId: z.string().optional().or(z.literal('')),
  storeId: z.string().optional().or(z.literal('')),
  lines: z.array(lineSchema).min(1, 'Add at least one line'),
});
type FormValues = z.infer<typeof schema>;

const EMPTY_LINE = { productId: '', categoryIds: '', quantity: 1, unitPrice: 0 };

/**
 * Promotion / Coupon Tester — `promotions.promotions.view`. Calls the real,
 * read-only `POST /promotions/evaluate` (`PromotionEvaluationController`) —
 * the exact discount-calculation code path Checkout itself will call, per
 * that controller's own docblock, which names this as mirroring Pricing's
 * `TaxCalculationController`/Checkout Price Preview precedent directly.
 * Never mutates state: no `PromotionRedemption` row is created, no
 * `promotion.redeemed` audit entry appears — this is a genuine simulation,
 * not a real redemption, exactly the way Checkout Price Preview simulates
 * a price without creating a real `CheckoutSession`.
 */
export function PromotionTesterPage() {
  const [result, setResult] = useState<PromotionEvaluationDTO | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currencyCode: '', couponCode: '', customerId: '', storeId: '', lines: [EMPTY_LINE] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  async function onSubmit(values: FormValues): Promise<void> {
    setTestError(null);
    setIsTesting(true);
    const currencyCode = values.currencyCode.toUpperCase();
    const items = values.lines.map((line) => ({
      productId: line.productId,
      categoryIds: line.categoryIds ? line.categoryIds.split(',').map((id) => id.trim()).filter(Boolean) : undefined,
      quantity: line.quantity,
      unitPrice: String(line.unitPrice),
    }));
    const subtotal = values.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    try {
      const evaluation = await evaluatePromotions(apiClient, {
        items,
        subtotal: String(subtotal),
        currencyCode,
        couponCode: values.couponCode || null,
        customerId: values.customerId || null,
        storeId: values.storeId || null,
      });
      setResult(evaluation);
    } catch (error) {
      setTestError(marketingErrorMessage(error));
      setResult(null);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Promotion / Coupon Tester"
        description="Simulate a cart against the real, live discount-evaluation endpoint Checkout itself uses — see which real promotions would apply and what a coupon code would be worth, without creating a real order or redemption."
      />

      <Card className="p-4">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Currency" placeholder="USD" maxLength={3} className="uppercase" error={errors.currencyCode?.message} {...register('currencyCode')} />
            <Input label="Coupon code (optional)" placeholder="SUMMER10" {...register('couponCode')} />
            <Input label="Customer id (optional)" placeholder="A real Customer id" {...register('customerId')} />
          </div>
          <div className="w-full sm:w-1/3">
            <Input label="Store id (optional)" placeholder="A real Store id" {...register('storeId')} />
          </div>

          <div className="flex flex-col gap-2">
            <Text variant="body-strong">Cart lines</Text>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_2fr_1fr_1fr_auto] sm:items-end">
                <Input
                  label={index === 0 ? 'Product id' : undefined}
                  aria-label="Product id"
                  placeholder="A real Product id"
                  error={errors.lines?.[index]?.productId?.message}
                  {...register(`lines.${index}.productId` as const)}
                />
                <Input
                  label={index === 0 ? 'Category ids (optional)' : undefined}
                  aria-label="Category ids"
                  placeholder="comma-separated"
                  {...register(`lines.${index}.categoryIds` as const)}
                />
                <Input
                  label={index === 0 ? 'Qty' : undefined}
                  aria-label="Quantity"
                  type="number"
                  min={1}
                  step={1}
                  error={errors.lines?.[index]?.quantity?.message}
                  {...register(`lines.${index}.quantity` as const)}
                />
                <Input
                  label={index === 0 ? 'Unit price' : undefined}
                  aria-label="Unit price"
                  type="number"
                  min={0}
                  step={0.01}
                  error={errors.lines?.[index]?.unitPrice?.message}
                  {...register(`lines.${index}.unitPrice` as const)}
                />
                <Button type="button" variant="ghost" size="sm" aria-label={`Remove line ${index + 1}`} onClick={() => remove(index)} disabled={fields.length === 1}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {(errors.lines?.root?.message ?? errors.lines?.message) && (
              <Text variant="caption" className="text-feedback-danger">
                {errors.lines.root?.message ?? errors.lines.message}
              </Text>
            )}
            <Button type="button" variant="secondary" size="sm" className="self-start" onClick={() => append(EMPTY_LINE)}>
              <Plus className="size-4" /> Add line
            </Button>
          </div>

          <Button type="submit" loading={isTesting} className="self-start">
            <FlaskConical className="size-4" /> Test this cart
          </Button>
        </form>
      </Card>

      {testError && (
        <Alert variant="danger" className="mt-4" role="alert">
          {testError}
        </Alert>
      )}

      {result && (
        <Card className="mt-4 p-4">
          <div className="flex flex-col gap-3">
            {result.appliedPromotions.length === 0 ? (
              <Text variant="body" className="text-text-secondary">
                No real promotion applies to this cart.
              </Text>
            ) : (
              result.appliedPromotions.map((applied) => (
                <div key={applied.promotionId} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="size-4 text-feedback-success" aria-hidden="true" />
                    <div>
                      <Text variant="body-strong">{applied.name}</Text>
                      <Text variant="caption" className="text-text-secondary">
                        {applied.discountType}
                        {applied.couponId ? ' · via coupon' : ''}
                      </Text>
                    </div>
                  </div>
                  <Text variant="body-strong" className="tabular-nums">
                    {formatDecimal(applied.discountAmount)}
                  </Text>
                </div>
              ))
            )}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <Text variant="body-strong">Total discount</Text>
              <Text variant="stat" className="tabular-nums">
                {formatDecimal(result.totalDiscount)}
              </Text>
            </div>
            {result.freeShipping && (
              <Badge variant="success" className="self-start">
                Free shipping applies
              </Badge>
            )}
            <Text variant="caption" className="text-text-secondary">
              This is a real, live calculation — no order, redemption, or usage count was created by this test.
            </Text>
          </div>
        </Card>
      )}
    </div>
  );
}
