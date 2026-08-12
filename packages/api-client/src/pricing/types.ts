/**
 * Pricing DTOs — the exact camelCase shape of `apps/backend`'s real
 * `PriceListResource`/`PriceListEntryResource` and the exact fields the real
 * `Create/UpdatePriceListRequest`/`Create/UpdatePriceListEntryRequest`
 * classes accept. Slice 1 covers Price Lists + Price List Entries only —
 * `planning/reviews/PHASE_2_4_PRICING_ARCHITECTURE_REVIEW.md`'s approved
 * scope. Tax Zones/Classes/Rates are a later slice, not represented here.
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
