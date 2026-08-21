/**
 * Localization, currency, and store resolution —
 * STORE_FRONTEND_ARCHITECTURE.md §§6–7's already-designed rules, made real
 * at the Gateway layer: "every request is resolved to exactly one store
 * BEFORE any route matches" (§1.3), via "a pure function from request →
 * store identifier" so a future multi-domain lookup is "a change to that
 * one resolution function, never a change to any route" (§6).
 *
 * Phase 1 backend scope (confirmed, this and prior research passes) is
 * single-store, single-locale — so this resolves to the one configured
 * default today. The function signature and its multi-domain-ready shape
 * (keyed by Host header) are what this slice actually delivers; real
 * multi-store resolution logic is explicitly future scope, per this
 * slice's own STRICT DO NOT list.
 */
import type { Env } from '../config/env.js';

export interface StoreContext {
  /** Single default store, Phase 1 — see docblock. Kept as an explicit field (not a hardcoded literal at every call site) so multi-store resolution is a one-line change here later. */
  storeId: 'default';
  locale: string;
  currency: string;
}

/**
 * Resolves locale from, in order: an explicit `?locale=` query override
 * (useful for preview/testing), the `Accept-Language` header (first
 * supported match), then the configured default — never an unsupported
 * locale silently accepted.
 */
export function resolveLocale(env: Env, queryLocale: string | undefined, acceptLanguageHeader: string | undefined): string {
  if (queryLocale && env.SUPPORTED_LOCALES.includes(queryLocale)) {
    return queryLocale;
  }
  if (acceptLanguageHeader) {
    const requested = acceptLanguageHeader
      .split(',')
      .map((part) => part.split(';')[0]?.trim().split('-')[0])
      .filter((value): value is string => Boolean(value));
    const match = requested.find((locale) => env.SUPPORTED_LOCALES.includes(locale));
    if (match) return match;
  }
  return env.DEFAULT_LOCALE;
}

export function resolveCurrency(env: Env, queryCurrency: string | undefined): string {
  if (queryCurrency && /^[A-Z]{3}$/.test(queryCurrency)) {
    return queryCurrency;
  }
  return env.DEFAULT_CURRENCY;
}

/**
 * Store resolution, keyed by the request's own Host header — multi-domain
 * ready by construction (STORE_FRONTEND_ARCHITECTURE.md §6), a no-op
 * lookup today since only one store exists. Deliberately still reads
 * `hostHeader` (rather than ignoring the parameter) so the call site
 * doesn't need to change when a real lookup is added.
 */
export function resolveStore(_hostHeader: string | undefined): 'default' {
  return 'default';
}

export function resolveStoreContext(
  env: Env,
  params: { hostHeader: string | undefined; queryLocale: string | undefined; queryCurrency: string | undefined; acceptLanguageHeader: string | undefined },
): StoreContext {
  return {
    storeId: resolveStore(params.hostHeader),
    locale: resolveLocale(env, params.queryLocale, params.acceptLanguageHeader),
    currency: resolveCurrency(env, params.queryCurrency),
  };
}
