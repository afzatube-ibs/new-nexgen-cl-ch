<?php

declare(strict_types=1);

/**
 * Phase 1.1 Production Hardening finding (`SECURITY_REVIEW.md` S-5,
 * `TECHNICAL_DEBT_REPORT.md` TD-4, `ARCHITECTURE_REVIEW_PHASE1.md` B-28):
 * this application previously had no `config/cors.php` at all, silently
 * running on Laravel's package default (`allowed_origins => ['*']`,
 * `allowed_methods => ['*']`, `allowed_headers => ['*']`) — never an
 * unreviewed choice, per `SECURITY:SECURE_CONFIGURATION`'s "default
 * configuration is secure without operator intervention," but also never
 * a *reviewed* one either, which is the gap this file closes.
 *
 * `allowed_origins` still defaults to `*` — this is a pure API backend
 * with no first-party browser client yet (`ADR-0005`, Admin Interface, is
 * still Draft; no frontend package exists anywhere in this repository).
 * `supports_credentials` stays `false`: Sanctum authenticates this API via
 * bearer tokens in the `Authorization` header, never via cookies, so
 * wildcard-origin CORS cannot be combined with credentialed cookie theft —
 * the one combination (`origins: '*'` + `credentials: true`) that would be
 * a real vulnerability. `allowed_methods`/`allowed_headers` are narrowed
 * to what this API actually uses, rather than inheriting the package's own
 * wildcard, so a caller attempting an unexpected method/header is refused
 * by the CORS preflight itself rather than merely by this API never having
 * implemented it.
 *
 * `CORS_ALLOWED_ORIGINS` (comma-separated) is the one value a future
 * browser-based client (an Admin UI, a storefront — see `ADR-0005`/
 * `ADR-0006`) MUST set before going to production: a real, named list of
 * origins, never `*`, the moment `supports_credentials` would ever need to
 * become `true` for either of them.
 */
return [

    'paths' => ['api/*'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => array_values(array_filter(array_map(
        trim(...),
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', '*')),
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With', 'X-Correlation-Id'],

    'exposed_headers' => ['X-Correlation-Id'],

    'max_age' => 0,

    'supports_credentials' => false,

];
