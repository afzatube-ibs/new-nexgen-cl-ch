import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Calculator, TriangleAlert } from 'lucide-react';
import { Button, Input, Card, Text, Alert } from '@nexgen/ui';
import { PageHeader } from '../../../framework/index.js';
import { lookupPrice } from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';
import { formatCurrency } from '../shared/formatCurrency.js';

const lineSchema = z.object({
  sku: z.string().min(1, 'Enter a SKU'),
  quantity: z.coerce.number({ message: 'Enter a quantity' }).int('Whole numbers only').positive('Enter at least 1'),
});

const schema = z.object({
  currencyCode: z.string().length(3, 'Enter a 3-letter currency code, e.g. USD'),
  lines: z.array(lineSchema).min(1, 'Add at least one line'),
});
type FormValues = z.infer<typeof schema>;

interface LineResult {
  sku: string;
  quantity: number;
  unitPrice: string | null;
  lineSubtotal: number | null;
}

interface PreviewOutcome {
  currencyCode: string;
  lines: LineResult[];
}

const EMPTY_LINE = { sku: '', quantity: 1 };

/**
 * Checkout Price Preview — `pricing.price_lists.view`. Previews the *price*
 * component of a real Checkout by calling `GET /pricing/lookup`
 * (`LookupPriceAction`) once per line, exactly the way `ReviewCheckoutAction`
 * itself does — never a parallel reimplementation of the pricing rule.
 *
 * Deliberately excludes tax, shipping, and promotions/coupons: this slice's
 * brief excludes Tax UI, Promotions, and Coupons outright, and none of the
 * three are Pricing's own concern in the first place (`ReviewCheckoutAction`
 * calls `CalculateTaxAction` and `EvaluatePromotionsAction` too, but those
 * belong to Tax and Promotions respectively). A real checkout session's
 * total will differ from this preview by whatever tax/shipping/discount
 * applies — that's stated up front, not hidden.
 *
 * Does not create a real `CheckoutSession` — a merchant checking prices
 * shouldn't leave behind session/audit-log records that look like a real
 * cart. Every number shown comes from the real backend; only the summing is
 * done client-side, same as this tool's own label says.
 */
export function CheckoutPricePreviewPage() {
  const [outcome, setOutcome] = useState<PreviewOutcome | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currencyCode: '', lines: [EMPTY_LINE] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  async function onSubmit(values: FormValues): Promise<void> {
    setPreviewError(null);
    setIsPreviewing(true);
    const currencyCode = values.currencyCode.toUpperCase();
    try {
      const lines = await Promise.all(
        values.lines.map(async (line): Promise<LineResult> => {
          const entry = await lookupPrice(apiClient, { sku: line.sku, currencyCode });
          if (!entry) return { sku: line.sku, quantity: line.quantity, unitPrice: null, lineSubtotal: null };
          const unitPrice = entry.effectivePrice;
          return { sku: line.sku, quantity: line.quantity, unitPrice, lineSubtotal: Number(unitPrice) * line.quantity };
        }),
      );
      setOutcome({ currencyCode, lines });
    } catch {
      setPreviewError('Something went wrong previewing these prices. Please try again.');
      setOutcome(null);
    } finally {
      setIsPreviewing(false);
    }
  }

  const unpricedCount = outcome?.lines.filter((r) => r.unitPrice === null).length ?? 0;
  const subtotal = outcome?.lines.reduce((sum, r) => sum + (r.lineSubtotal ?? 0), 0) ?? 0;

  return (
    <div>
      <PageHeader
        title="Checkout Price Preview"
        description="Preview what a cart of SKUs would price at, using the exact price resolution Checkout itself uses. Tax, shipping, and promotions are calculated later in real Checkout — not shown here."
      />

      <Card className="p-4">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="w-full sm:w-40">
            <Input label="Currency" placeholder="USD" maxLength={3} className="uppercase" error={errors.currencyCode?.message} {...register('currencyCode')} />
          </div>

          <div className="flex flex-col gap-2">
            <Text variant="body-strong">Cart lines</Text>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label={index === 0 ? 'SKU' : undefined}
                    aria-label="SKU"
                    placeholder="e.g. TSHIRT-BLU-M"
                    error={errors.lines?.[index]?.sku?.message}
                    {...register(`lines.${index}.sku` as const)}
                  />
                </div>
                <div className="w-24">
                  <Input
                    label={index === 0 ? 'Qty' : undefined}
                    aria-label="Quantity"
                    type="number"
                    min={1}
                    step={1}
                    error={errors.lines?.[index]?.quantity?.message}
                    {...register(`lines.${index}.quantity` as const)}
                  />
                </div>
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

          <Button type="submit" loading={isPreviewing} className="self-start">
            <Calculator className="size-4" /> Preview prices
          </Button>
        </form>
      </Card>

      {previewError && (
        <Alert variant="danger" className="mt-4" role="alert">
          {previewError}
        </Alert>
      )}

      {outcome && (
        <Card className="mt-4 p-4">
          <div className="flex flex-col gap-2">
            {outcome.lines.map((line, index) => (
              // eslint-disable-next-line react/no-array-index-key -- the same SKU can legitimately appear on two lines (a merchant retyping it), so SKU alone isn't a stable unique key
              <div key={`${line.sku}-${index}`} className="flex items-center justify-between border-b border-border py-2 last:border-b-0">
                <div>
                  <Text variant="body-strong">{line.sku}</Text>
                  <Text variant="caption" className="text-text-secondary">
                    Qty {line.quantity}
                  </Text>
                </div>
                {line.unitPrice === null ? (
                  <div className="flex items-center gap-1.5 text-feedback-warning">
                    <TriangleAlert className="size-4" aria-hidden="true" />
                    <Text variant="caption">No price available</Text>
                  </div>
                ) : (
                  <Text variant="body" className="tabular-nums">
                    {formatCurrency(String(line.lineSubtotal), outcome.currencyCode)}
                  </Text>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <Text variant="body-strong">Subtotal (price only)</Text>
              <Text variant="stat" className="tabular-nums">
                {formatCurrency(String(subtotal), outcome.currencyCode)}
              </Text>
            </div>
            {unpricedCount > 0 && (
              <Text variant="caption" className="text-feedback-warning">
                {unpricedCount} of {outcome.lines.length} {unpricedCount === 1 ? 'line has' : 'lines have'} no price and {unpricedCount === 1 ? 'is' : 'are'} excluded
                from this subtotal — real Checkout would reject this cart until {unpricedCount === 1 ? 'it is' : 'they are'} priced.
              </Text>
            )}
            <Text variant="caption" className="text-text-secondary">
              Excludes tax, shipping, and promotions/coupons — those are calculated later in real Checkout.
            </Text>
          </div>
        </Card>
      )}
    </div>
  );
}
