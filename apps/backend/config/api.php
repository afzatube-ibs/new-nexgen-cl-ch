<?php

declare(strict_types=1);

/**
 * MODULE:PLATFORM_FOUNDATION-wide API configuration.
 *
 * `API:RATE_LIMITING` (`docs/06_API_STANDARD.md` §20): "the platform must
 * protect itself and every module from being overwhelmed... enforced
 * consistently at the API boundary platform-wide, not as a bespoke concern
 * each module handles differently." Phase 1 shipped three narrower,
 * intentionally-stricter named limiters (`login`, `install`,
 * `payments-webhooks`) but never the general-purpose floor beneath them —
 * this file is that floor's one tunable value. See
 * `Providers\FoundationServiceProvider::boot()` for where it is registered
 * as the `api` RateLimiter, and `bootstrap/app.php` for where
 * `throttleApi()` applies it to every route in the `api` middleware group
 * platform-wide (i.e. every route in every one of the 19 modules, with
 * zero per-module wiring required).
 */
return [

    /*
    |--------------------------------------------------------------------------
    | Default API Rate Limit
    |--------------------------------------------------------------------------
    |
    | Requests per minute, per authenticated user (falling back to per-IP
    | for an unauthenticated caller — e.g. a request that will itself be
    | rejected 401 by `auth:sanctum`, still worth rate-limiting so a caller
    | cannot use failed-auth attempts to bypass the ceiling). 120/minute is
    | a deliberately generous starting point for an internal/staff-facing
    | admin-style API with no public storefront traffic yet in Phase 1 —
    | tunable without a deploy via `API_RATE_LIMIT_PER_MINUTE`, and the
    | first value to reconsider once real traffic patterns exist.
    |
    */
    'rate_limit_per_minute' => (int) env('API_RATE_LIMIT_PER_MINUTE', 120),

];
