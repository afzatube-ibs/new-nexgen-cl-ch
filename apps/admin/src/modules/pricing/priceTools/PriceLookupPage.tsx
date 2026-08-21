import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, TriangleAlert, Tag } from 'lucide-react';
import { Button, Input, Card, Text, Badge, Alert } from '@nexgen/ui';
import { PageHeader } from '../../../framework/index.js';
import { pricingErrorMessage } from '../shared/errors.js';
import { formatCurrency } from '../shared/formatCurrency.js';
import { useCatalogProductBySku } from '../shared/catalogLookup.js';
import { useAllPriceLists } from '../priceLists/queries.js';
import { useLookupPrice } from './queries.js';

const schema = z.object({
  sku: z.string().min(1, 'Enter a SKU'),
  currencyCode: z.string().length(3, 'Enter a 3-letter currency code, e.g. USD'),
});
type FormValues = z.infer<typeof schema>;

/**
 * Price Lookup — `pricing.price_lists.view`. Answers "what would this SKU
 * cost right now, in this currency" using `GET /pricing/lookup`
 * (`LookupPriceAction`) — the *exact* action Checkout's own
 * `ReviewCheckoutAction` calls per line item, not a parallel
 * reimplementation. Resolves only from the currency's default, active
 * Price List, exactly like Checkout — a "no price" result here means
 * Checkout would genuinely fail to price this SKU too, not a UI gap.
 */
export function PriceLookupPage() {
  const { data: allPriceLists } = useAllPriceLists();
  const lookupMutation = useLookupPrice();
  const [lastQuery, setLastQuery] = useState<{ sku: string; currencyCode: string } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { sku: '', currencyCode: '' } });

  const watchedSku = watch('sku');
  const { data: matchedProduct } = useCatalogProductBySku(lastQuery?.sku ?? watchedSku);

  async function onSubmit(values: FormValues): Promise<void> {
    const currencyCode = values.currencyCode.toUpperCase();
    setLastQuery({ sku: values.sku, currencyCode });
    await lookupMutation.mutateAsync({ sku: values.sku, currencyCode });
  }

  const result = lookupMutation.data;
  const hasSearched = lookupMutation.isSuccess || lookupMutation.isError;

  // The default Price List for the searched currency, if any — used to name
  // where a found price came from, and to give an actionable reason when
  // none is found (matches `LookupPriceAction`'s own resolution rule: only
  // ever the default, active list in that currency).
  const defaultListForCurrency = lastQuery ? (allPriceLists ?? []).find((l) => l.currencyCode === lastQuery.currencyCode && l.isDefault && l.status === 'active') : undefined;

  return (
    <div>
      <PageHeader title="Price Lookup" description="Look up a SKU's current price in any currency — exactly what Checkout would charge right now." />

      <Card className="p-4">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input label="SKU" placeholder="e.g. TSHIRT-BLU-M" error={errors.sku?.message} {...register('sku')} />
          </div>
          <div className="w-full sm:w-40">
            <Input label="Currency" placeholder="USD" maxLength={3} className="uppercase" error={errors.currencyCode?.message} {...register('currencyCode')} />
          </div>
          <Button type="submit" loading={lookupMutation.isPending}>
            <Search className="size-4" /> Look up
          </Button>
        </form>
      </Card>

      {lookupMutation.isPending && (
        <Card className="mt-4 p-4">
          <Text variant="body" className="text-text-secondary">
            Looking up…
          </Text>
        </Card>
      )}

      {lookupMutation.isError && (
        <Alert variant="danger" className="mt-4" role="alert">
          {pricingErrorMessage(lookupMutation.error)}
        </Alert>
      )}

      {hasSearched && !lookupMutation.isPending && !lookupMutation.isError && lastQuery && (
        <Card className="mt-4 p-4">
          {result ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <Text variant="caption" className="text-text-secondary">
                    {lastQuery.sku} in {lastQuery.currencyCode}
                    {matchedProduct ? ` — ${matchedProduct.name}` : ''}
                  </Text>
                  <Text variant="stat" className="tabular-nums">
                    {formatCurrency(result.effectivePrice, lastQuery.currencyCode)}
                  </Text>
                </div>
                {result.isSaleActive && (
                  <Badge className="gap-1 bg-feedback-success text-black">
                    <Tag className="size-3" aria-hidden="true" /> On sale
                  </Badge>
                )}
              </div>
              {result.isSaleActive && (
                <Text variant="caption" className="text-text-secondary">
                  Base price {formatCurrency(result.basePrice, lastQuery.currencyCode)}, reduced to the sale price above.
                </Text>
              )}
              {defaultListForCurrency && (
                <Text variant="caption" className="text-text-secondary">
                  Resolved from {defaultListForCurrency.name} — the default {lastQuery.currencyCode} price list.
                </Text>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <TriangleAlert className="size-4 text-feedback-warning" aria-hidden="true" />
                <Text variant="body-strong">No price found</Text>
              </div>
              <Text variant="body" className="text-text-secondary">
                {defaultListForCurrency
                  ? `${defaultListForCurrency.name} (the default ${lastQuery.currencyCode} price list) has no entry for ${lastQuery.sku}. Checkout would fail to price this SKU in ${lastQuery.currencyCode} right now.`
                  : `There is no active, default price list for ${lastQuery.currencyCode}. Checkout can't price anything in this currency until one is set — see Price Lists.`}
              </Text>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
