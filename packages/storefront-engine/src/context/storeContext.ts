/**
 * One normalized Store Context per request — this milestone's own required
 * build item 6 ("Create one normalized Store Context... Everything uses
 * this"). Mirrors `CDP_ARCHITECTURE.md`'s own Personalization Context shape
 * (`apps/store-api-gateway/src/personalization/context.ts`, Slice 1.5) so
 * the Storefront and the Gateway describe "who is this visitor" the exact
 * same way rather than inventing a second shape — the Storefront's own
 * copy exists because a Next.js Server Component resolves some of this
 * (locale/currency from the URL, per `STORE_FRONTEND_ARCHITECTURE.md` §7)
 * independently of the Gateway's own per-request resolution, and both
 * must agree by applying the identical default/override logic, not by one
 * asking the other over the network on every render.
 */

export const DEFAULT_LOCALE = 'en';
export const DEFAULT_CURRENCY = 'USD';
export const SUPPORTED_LOCALES = ['en'] as const;

export interface StoreContext {
  /** Today: always the single default store — `STORE_FRONTEND_ARCHITECTURE.md` §6's own "Phase 1 backend, single-tenant" scope. A future multi-store lookup changes only `resolveStoreContext`'s own body. */
  store: 'default';
  locale: string;
  currency: string;
  /** The active theme's own id — `null` until a real Theme Package is configured (M3, a later milestone; `THEME_ENGINE_ARCHITECTURE.md` §3 step 2's own "no Store.activeThemeId field exists yet" gap). */
  theme: string | null;
  /**
   * Framework only, per this milestone's own build item 6 — the Gateway
   * exposes a real Feature Flag evaluator (`flags/evaluator.ts`, Slice 1.5)
   * but no public `/v1/flags` route yet to evaluate one for the current
   * request; this field is real-shaped and always empty today, not a
   * fabricated value, until that Gateway route exists.
   */
  featureFlags: Record<string, boolean>;
  personalization: {
    utm: {
      source: string | null;
      medium: string | null;
      campaign: string | null;
    };
    referrer: string | null;
    device: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  };
  requestContext: {
    /** This Next.js request's own id — distinct from the Gateway's own `X-Request-Id`/`X-Trace-Id` (a second, this-app-local identifier for this app's own server logs), per `STORE_API_GATEWAY_ARCHITECTURE.md` §7.2's own "three distinct identifiers" precedent applied one layer further. */
    requestId: string;
  };
}

export interface ResolveStoreContextInput {
  /** The URL's own `?locale=` override, if present. */
  localeParam?: string | null;
  /** The URL's own `?currency=` override, if present. */
  currencyParam?: string | null;
  searchParams?: URLSearchParams;
  referrer?: string | null;
  userAgent?: string | null;
  requestId: string;
}

function resolveLocale(param?: string | null): string {
  if (param && (SUPPORTED_LOCALES as readonly string[]).includes(param)) return param;
  return DEFAULT_LOCALE;
}

function resolveCurrency(param?: string | null): string {
  if (param && /^[A-Z]{3}$/.test(param)) return param;
  return DEFAULT_CURRENCY;
}

function classifyDevice(userAgent: string | null | undefined): StoreContext['personalization']['device'] {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet(?!.*mobile)/.test(ua)) return 'tablet';
  if (/mobi|iphone|android/.test(ua)) return 'mobile';
  return 'desktop';
}

export function resolveStoreContext(input: ResolveStoreContextInput): StoreContext {
  const params = input.searchParams;
  return {
    store: 'default',
    locale: resolveLocale(input.localeParam ?? params?.get('locale')),
    currency: resolveCurrency(input.currencyParam ?? params?.get('currency')),
    theme: null,
    featureFlags: {},
    personalization: {
      utm: {
        source: params?.get('utm_source') ?? null,
        medium: params?.get('utm_medium') ?? null,
        campaign: params?.get('utm_campaign') ?? null,
      },
      referrer: input.referrer ?? null,
      device: classifyDevice(input.userAgent),
    },
    requestContext: {
      requestId: input.requestId,
    },
  };
}
