/**
 * Pricing DTOs — the exact camelCase shape of `apps/backend`'s real
 * `PriceListResource`/`PriceListEntryResource`/`TaxZoneResource`/
 * `TaxClassResource`/`TaxRateResource` and the exact fields the real
 * `Create/Update*Request` classes accept. Slice 1 covered Price Lists +
 * Price List Entries (`planning/reviews/
 * PHASE_2_4_PRICING_ARCHITECTURE_REVIEW.md`'s approved scope); Slice 3
 * (this addition) covers Tax Zones/Classes/Rates against that same,
 * already-complete backend — no new endpoint, table, or business rule.
 */

// ---------------------------------------------------------------------------
// PriceList
// ---------------------------------------------------------------------------

export type PriceListStatus = 'active' | 'archived';

export interface PriceListEntryDTO {
  id: string;
  priceListId: string;
  sku: string;
  basePrice: string;
  compareAtPrice: string | null;
  salePrice: string | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  /** Server-computed: `sale_price` is set AND `now()` falls within the optional [saleStartsAt, saleEndsAt] window. */
  isSaleActive: boolean;
  /** Server-computed: `salePrice` when `isSaleActive`, otherwise `basePrice`. */
  effectivePrice: string;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PriceListDTO {
  id: string;
  name: string;
  /** ISO 4217, always 3 uppercase letters — validated server-side against Localization & Currency's real active-currency list. */
  currencyCode: string;
  /** At most one PriceList per currency may be `true` — `LookupPriceAction` (and therefore Checkout) only ever resolves prices from the default list in a given currency. */
  isDefault: boolean;
  status: PriceListStatus;
  /** Present only when the detail endpoint (`GET /price-lists/{id}`) loaded them — the list endpoint (`GET /price-lists`) never includes entries. */
  entries?: PriceListEntryDTO[];
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreatePriceListInput {
  name: string;
  currencyCode: string;
}

export interface UpdatePriceListInput {
  name?: string;
  currencyCode?: string;
  isDefault?: boolean;
  expectedVersion: number;
}

/** `PriceListController::index` supports `status` and `currency_code` filters, plus Laravel's own `page` — no `per_page`, no free-text `search`. */
export interface ListPriceListsQuery {
  status?: PriceListStatus;
  currencyCode?: string;
  page?: number;
}

// ---------------------------------------------------------------------------
// PriceListEntry
// ---------------------------------------------------------------------------

export interface CreatePriceListEntryInput {
  sku: string;
  basePrice: string;
  compareAtPrice?: string | null;
  salePrice?: string | null;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
}

export interface UpdatePriceListEntryInput {
  sku?: string;
  basePrice?: string;
  compareAtPrice?: string | null;
  salePrice?: string | null;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  expectedVersion: number;
}

// ---------------------------------------------------------------------------
// TaxZone
// ---------------------------------------------------------------------------

export type TaxStatus = 'active' | 'archived';

export interface TaxZoneDTO {
  id: string;
  name: string;
  /** 2-letter ISO country code, always uppercase — server-normalized regardless of input case. */
  countryCode: string;
  /** Empty string means country-wide; a non-empty value (e.g. `"CA"`) narrows the zone to that region/state/province — `TaxZone::isCountryWide()`'s own definition. */
  region: string;
  status: TaxStatus;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateTaxZoneInput {
  name: string;
  countryCode: string;
  /** Omit (or send `''`) for a country-wide zone. */
  region?: string;
}

export interface UpdateTaxZoneInput {
  name?: string;
  countryCode?: string;
  region?: string;
  expectedVersion: number;
}

/** `TaxZoneController::index` reads `status` and Laravel's own `page` only — no `per_page`, no free-text `search`, hardcoded `orderBy('country_code')->orderBy('region')`. */
export interface ListTaxZonesQuery {
  status?: TaxStatus;
  page?: number;
}

// ---------------------------------------------------------------------------
// TaxClass
// ---------------------------------------------------------------------------

export interface TaxClassDTO {
  id: string;
  name: string;
  status: TaxStatus;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateTaxClassInput {
  name: string;
}

export interface UpdateTaxClassInput {
  name?: string;
  expectedVersion: number;
}

/** `TaxClassController::index` reads `status` and `page` only — hardcoded `orderBy('name')`. */
export interface ListTaxClassesQuery {
  status?: TaxStatus;
  page?: number;
}

// ---------------------------------------------------------------------------
// TaxRate
// ---------------------------------------------------------------------------

export interface TaxRateDTO {
  id: string;
  taxZoneId: string;
  taxClassId: string;
  /** A percentage stored to 4 decimal places, e.g. `"8.5000"` means 8.5%. */
  rate: string;
  status: TaxStatus;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateTaxRateInput {
  taxZoneId: string;
  taxClassId: string;
  rate: string;
}

export interface UpdateTaxRateInput {
  taxZoneId?: string;
  taxClassId?: string;
  rate?: string;
  expectedVersion: number;
}

/** `TaxRateController::index` reads `status`, `tax_zone_id`, `tax_class_id`, and `page` — no free-text `search`, no `sort` (default insertion order). */
export interface ListTaxRatesQuery {
  status?: TaxStatus;
  taxZoneId?: string;
  taxClassId?: string;
  page?: number;
}
