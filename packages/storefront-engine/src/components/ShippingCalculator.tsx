'use client';

import { useState, type FormEvent } from 'react';
import { Alert, Button, Select, Text } from '@nexgen/ui';
import { fetchShippingOptions, type CheckoutShippingOption } from '../checkout/checkoutClient.js';
import { BANGLADESH_DIVISIONS } from './bdDivisions.js';

export interface ShippingCalculatorProps {
  productId: string;
  quantity?: number;
  className?: string;
}

/** Product-page estimator backed by the same server-authoritative quote used at checkout. */
export function ShippingCalculator({ productId, quantity = 1, className }: ShippingCalculatorProps) {
  const [divisionId, setDivisionId] = useState('');
  const [options, setOptions] = useState<CheckoutShippingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoted, setQuoted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const region = BANGLADESH_DIVISIONS.find((division) => division.id === divisionId)?.name;
    if (!region || loading) return;

    setLoading(true);
    setError(null);
    setQuoted(false);
    try {
      const result = await fetchShippingOptions({
        countryCode: 'BD',
        currencyCode: 'BDT',
        region,
        lines: [{ productId, quantity }],
      });
      setOptions(result);
      setQuoted(true);
    } catch (requestError) {
      setOptions([]);
      setError(requestError instanceof Error ? requestError.message : 'Could not calculate delivery rates. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="min-w-52 flex-1">
          <Select
            label="Delivery division"
            placeholder="Select division"
            value={divisionId}
            options={BANGLADESH_DIVISIONS.map((division) => ({ value: division.id, label: division.name }))}
            onValueChange={(value) => {
              setDivisionId(value);
              setOptions([]);
              setQuoted(false);
              setError(null);
            }}
          />
        </div>
        <Button type="submit" variant="secondary" loading={loading} disabled={!divisionId || loading}>Calculate</Button>
      </form>

      {error && <Alert variant="danger" role="alert" className="mt-3">{error}</Alert>}
      {quoted && options.length === 0 && (
        <Text as="p" variant="body" role="status" className="mt-3 text-text-secondary">
          No delivery option is available for this product and division.
        </Text>
      )}
      {options.length > 0 && (
        <div className="mt-3 flex flex-col divide-y divide-border rounded-md border border-border" role="status" aria-label="Delivery estimates">
          {options.map((option) => (
            <div key={option.id} className="flex items-center justify-between gap-3 p-3">
              <Text as="span" variant="body">{option.label}</Text>
              <Text as="span" variant="body-strong">
                {new Intl.NumberFormat('en-BD', { style: 'currency', currency: option.currencyCode }).format(Number(option.amount))}
              </Text>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
