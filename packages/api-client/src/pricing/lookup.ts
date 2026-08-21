import type { ApiClient } from '../client.js';
import type { DataEnvelope } from '../types.js';
import type { PriceListEntryDTO } from './types.js';

export interface LookupPriceQuery {
  sku: string;
  currencyCode: string;
}

/**
 * `GET /pricing/lookup` — `PriceLookupController`/`LookupPriceAction`
 * (apps/backend), `pricing.price_lists.view`. This is the *exact* action
 * Checkout's own `ReviewCheckoutAction` calls once per line item — not a
 * parallel reimplementation — so a result here is always what real
 * Checkout would resolve for the same SKU/currency at this moment.
 *
 * Resolves only from the currency's *default, active* Price List, exactly
 * like Checkout — never a non-default list, even if one also has an entry
 * for the SKU (`LookupPriceAction`'s own docblock). Returns `{ data: null }`
 * (HTTP 200, not a 404) when no default list exists for the currency, or
 * the SKU has no entry in it — both map to `null` here, matching the
 * backend's own explicit choice to treat "no price" as a valid, non-error
 * response shape rather than an exception.
 */
export async function lookupPrice(client: ApiClient, query: LookupPriceQuery): Promise<PriceListEntryDTO | null> {
  const response = await client.get<DataEnvelope<PriceListEntryDTO | null>>('/pricing/lookup', {
    query: { sku: query.sku, currency_code: query.currencyCode },
  });
  return response.data;
}
