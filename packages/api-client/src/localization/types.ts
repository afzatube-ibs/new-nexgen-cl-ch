/**
 * Production Completion Plan v2, Milestone 10 (Settings Framework
 * Population + Localization Admin). Every field/endpoint here confirmed by
 * reading `apps/backend/app/Domains/Platform/Localization/` directly —
 * Models, Controllers, Actions, Requests, Resources, routes.
 */

export type LocalizationStatus = 'active' | 'archived';

/** `CurrencyResource` — `is_base` deliberately not settable at create time (`Actions\CreateCurrencyAction`'s own docblock: promoting to base is a separate operation). */
export interface CurrencyDTO {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  exchangeRate: string;
  isBase: boolean;
  status: LocalizationStatus;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** `LocaleResource` — `is_default` deliberately not settable at create time, same reasoning as Currency's own `is_base`. */
export interface LocaleDTO {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  isRtl: boolean;
  isDefault: boolean;
  status: LocalizationStatus;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** `CurrencyController::index`/`LocaleController::index` — `status` only, confirmed by reading both directly. */
export interface ListLocalizationQuery {
  status?: LocalizationStatus;
  page?: number;
}

/** Shared by every Localization archive/delete call — `ExpectedVersionRequest`. Domain-prefixed (not the bare `ExpectedVersionInput`) since this package's root `index.ts` barrel-exports every domain's `types.ts` with `export *`, and several domains already declare that bare name. */
export interface LocalizationExpectedVersionInput {
  expectedVersion: number;
}

/** `CreateCurrencyRequest` — `decimal_places` optional (server defaults it), `is_base` never accepted here. */
export interface CreateCurrencyInput {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces?: number;
  exchangeRate: string;
}

/** `UpdateCurrencyRequest` — every field optional except `expectedVersion`; `isBase` settable here (the real, separate "promote to base" path). */
export interface UpdateCurrencyInput {
  code?: string;
  name?: string;
  symbol?: string;
  decimalPlaces?: number;
  exchangeRate?: string;
  isBase?: boolean;
  expectedVersion: number;
}

/** `CreateLocaleRequest` — `is_rtl` optional, `is_default` never accepted here. */
export interface CreateLocaleInput {
  code: string;
  name: string;
  nativeName: string;
  isRtl?: boolean;
}

/** `UpdateLocaleRequest` — every field optional except `expectedVersion`; `isDefault` settable here (the real, separate "promote to default" path). */
export interface UpdateLocaleInput {
  code?: string;
  name?: string;
  nativeName?: string;
  isRtl?: boolean;
  isDefault?: boolean;
  expectedVersion: number;
}
