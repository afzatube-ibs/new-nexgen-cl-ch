/**
 * Shipping & Logistics DTOs — the exact camelCase shape of `apps/backend`'s
 * real `ShippingZoneResource`/`ShippingMethodResource`/`ShippingRateResource`/
 * `AuditLogResource` and the exact fields the real `Create/Update*Request`
 * classes accept. Phase 2.8 Slice 1 (`planning/architecture/
 * PHASE_2_8_SHIPPING_ARCHITECTURE.md`) — configuration + read-only Fulfillment
 * visibility only, against the already-complete backend
 * `app/Domains/Operations/Shipping`. No new endpoint, table, or business rule.
 */

// ---------------------------------------------------------------------------
// ShippingZone
// ---------------------------------------------------------------------------

export type ShippingZoneStatus = 'active' | 'archived';

export interface ShippingZoneDTO {
  id: string;
  name: string;
  countryCode: string;
  /** Empty string means country-wide (`ShippingZone::isCountryWide()`), never null. */
  region: string;
  status: ShippingZoneStatus;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateShippingZoneInput {
  name: string;
  countryCode: string;
  /** Omit entirely (not `''`) for a country-wide zone — see `zones.ts`'s own note, mirroring Pricing's identical `ConvertEmptyStringsToNull` finding. */
  region?: string;
}

export interface UpdateShippingZoneInput {
  name?: string;
  countryCode?: string;
  region?: string;
  expectedVersion: number;
}

/** `ShippingZoneController::index` — `status` and Laravel's own `page` only, hardcoded `orderBy('country_code')->orderBy('region')`. No free-text `search`, no `per_page` override — confirmed by reading the controller directly. */
export interface ListShippingZonesQuery {
  status?: ShippingZoneStatus;
  page?: number;
}

// ---------------------------------------------------------------------------
// ShippingMethod
// ---------------------------------------------------------------------------

export type ShippingMethodStatus = 'active' | 'archived';

export interface ShippingMethodDTO {
  id: string;
  code: string;
  name: string;
  description: string | null;
  /** Null means self-fulfilled (`ShippingMethod::isSelfFulfilled()`) — no courier hand-off. Never a free-text field: must match a code the Courier Registry recognizes, but this slice does not validate that client-side (server-authoritative, and the real registry is not exposed by this slice — see the completion report). */
  providerCode: string | null;
  status: ShippingMethodStatus;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateShippingMethodInput {
  code: string;
  name: string;
  description?: string | null;
  providerCode?: string | null;
}

export interface UpdateShippingMethodInput {
  code?: string;
  name?: string;
  description?: string | null;
  providerCode?: string | null;
  expectedVersion: number;
}

/** `ShippingMethodController::index` — `status` and `page` only, hardcoded `orderBy('name')`. */
export interface ListShippingMethodsQuery {
  status?: ShippingMethodStatus;
  page?: number;
}

// ---------------------------------------------------------------------------
// ShippingRate
// ---------------------------------------------------------------------------

export type ShippingRateStatus = 'active' | 'archived';

export interface ShippingRateDTO {
  id: string;
  shippingZoneId: string;
  shippingMethodId: string;
  minWeightGrams: number;
  /** Null means unbounded above — `ShippingRate::coversWeight()`'s own `[min, max)` semantics. */
  maxWeightGrams: number | null;
  amount: string;
  currencyCode: string;
  status: ShippingRateStatus;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateShippingRateInput {
  shippingZoneId: string;
  shippingMethodId: string;
  minWeightGrams?: number;
  maxWeightGrams?: number | null;
  amount: string;
  currencyCode: string;
}

export interface UpdateShippingRateInput {
  minWeightGrams?: number;
  maxWeightGrams?: number | null;
  amount?: string;
  currencyCode?: string;
  expectedVersion: number;
}

/** `ShippingRateController::index` — `status`/`shipping_zone_id`/`shipping_method_id`/`page`, hardcoded `orderBy('shipping_zone_id')->orderBy('min_weight_grams')`. No free-text `search`. */
export interface ListShippingRatesQuery {
  status?: ShippingRateStatus;
  shippingZoneId?: string;
  shippingMethodId?: string;
  page?: number;
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

export const SHIPPING_ZONE_TARGET_TYPE = 'App\\Domains\\Operations\\Shipping\\Models\\ShippingZone';
export const SHIPPING_METHOD_TARGET_TYPE = 'App\\Domains\\Operations\\Shipping\\Models\\ShippingMethod';
export const SHIPPING_RATE_TARGET_TYPE = 'App\\Domains\\Operations\\Shipping\\Models\\ShippingRate';

export interface ShippingAuditLogDTO {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  correlationId: string | null;
  createdAt: string;
}

/** `AuditLogController::index` (Shipping's own) — `actor_id`/`target_type`/`per_page` only, confirmed by reading it directly. No `target_id` filter — the same constraint every other module's own audit endpoint has. */
export interface ListShippingAuditLogsQuery {
  targetType?: string;
  actorId?: string;
  page?: number;
  perPage?: number;
}

/** `ShippingProviderController::index` / `Couriers\Contracts\ShippingProviderContract` — a code-and-config-defined provider, not an Eloquent row. */
export interface ShippingProviderDTO {
  code: string;
  label: string;
  available: boolean;
  supportsLiveRateQuote: boolean;
}
