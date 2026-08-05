<?php

declare(strict_types=1);

/**
 * MODULE:SHIPPING's courier configuration — mirrors config/payments.php's
 * structure and rationale exactly (see that file's docblock): every
 * courier credential below is sourced from the environment, never stored
 * in the database, never committed to version control (see .env.example
 * for the documented, empty placeholders every deployment must fill in).
 *
 * A courier whose required credentials are absent is simply unavailable
 * (Couriers\Contracts\ShippingProviderContract::isAvailable() returns
 * false and Couriers\ProviderResolver excludes it from resolution) — never
 * silently half-configured or faking a successful integration. Manual
 * requires no external credentials at all and is therefore always
 * available, matching this module's Bangladesh-first requirement that a
 * merchant can always fall back to self-managed dispatch.
 *
 * Bangladesh-first courier roster, per the approved brief: Steadfast,
 * Pathao, RedX, Paperfly, Sundarban, eCourier. Every courier is a
 * provider-agnostic Couriers\Contracts\ShippingProviderContract
 * implementation — "Future couriers must only implement the
 * ShippingProvider contract. No business logic changes required" is made
 * concrete by Couriers\ProviderFactory's `match` arm plus this file's own
 * `providers` list being the only two places a new courier's registration
 * touches.
 *
 * None of these couriers publish a live, real-time shipping-rate-quote API
 * a merchant integration can call per-shipment (confirmed against each
 * courier's own public developer documentation) — Bangladesh courier
 * pricing is contracted per-merchant and configured here as this
 * platform's own authoritative rate card (see the shipping_rates
 * migration and Actions\CalculateShippingRateAction), exactly as Pricing's
 * TaxRate is this platform's own configured rate rather than a live
 * government tax-rate API. Per PRINCIPLES:EXPLICIT_FAILURE, Couriers\
 * Contracts\ShippingProviderContract::quoteLiveRate() honestly returns
 * null for every courier below rather than fabricating a response — see
 * that method's own docblock.
 */
return [

    /*
    |--------------------------------------------------------------------------
    | Enabled Couriers
    |--------------------------------------------------------------------------
    |
    | The ordered list of courier codes this installation offers, resolved
    | by Couriers\ProviderFactory into concrete Couriers\Contracts\
    | ShippingProviderContract instances and registered into Couriers\
    | ProviderRegistry by Providers\ShippingServiceProvider::register(). A
    | code listed here with isAvailable() === false is registered but
    | excluded from Couriers\ProviderResolver's successful resolution — it
    | still appears to administrators as "configured but incomplete," not
    | simply missing, per PRINCIPLES:EXPLICIT_FAILURE.
    |
    */
    'providers' => explode(',', (string) env('SHIPPING_ENABLED_PROVIDERS', 'manual,steadfast,pathao,redx,paperfly,sundarban,ecourier')),

    'manual' => [
        // No credentials required — self-managed dispatch, always available.
    ],

    'steadfast' => [
        // https://portal.packzy.com/api/v1 — header-based API-Key/Secret-Key
        // authentication, per Steadfast's own published API documentation.
        'api_key' => env('STEADFAST_API_KEY'),
        'secret_key' => env('STEADFAST_SECRET_KEY'),
        'base_url' => env('STEADFAST_BASE_URL', 'https://portal.packzy.com/api/v1'),
    ],

    'pathao' => [
        // OAuth2 (client credentials + resource-owner password) against
        // Pathao's Courier Merchant API — sandbox vs. production is a
        // distinct base URL, per Pathao's own published API documentation.
        'client_id' => env('PATHAO_CLIENT_ID'),
        'client_secret' => env('PATHAO_CLIENT_SECRET'),
        'username' => env('PATHAO_USERNAME'),
        'password' => env('PATHAO_PASSWORD'),
        'sandbox' => (bool) env('PATHAO_SANDBOX', true),
        'base_url' => env('PATHAO_SANDBOX', true)
            ? 'https://courier-api-sandbox.pathao.com'
            : 'https://api-hermes.pathao.com',
    ],

    'redx' => [
        // Bearer-token (API-ACCESS-TOKEN) authentication against RedX's
        // OpenAPI parcel platform, per RedX's own published developer API.
        'api_token' => env('REDX_API_TOKEN'),
        'base_url' => env('REDX_BASE_URL', 'https://openapi.redx.com.bd/v1.0.0-beta'),
    ],

    'paperfly' => [
        // Paperfly issues per-seller API credentials and endpoint (no
        // single public base URL is published) — both are supplied
        // directly by the Paperfly account team per merchant, per
        // Paperfly's own onboarding process.
        'merchant_id' => env('PAPERFLY_MERCHANT_ID'),
        'api_key' => env('PAPERFLY_API_KEY'),
        'base_url' => env('PAPERFLY_BASE_URL'),
    ],

    'sundarban' => [
        // Sundarban Courier Service publishes no public merchant API at
        // this time (confirmed: no official developer documentation
        // exists) — this courier is registered for identity/selection
        // purposes only (a ShippingMethod may reference it as its
        // provider_code for manual/offline dispatch tracking) and is
        // never reported available for automated integration. See
        // Couriers\SundarbanProvider's docblock.
    ],

    'ecourier' => [
        // API-SECRET / API-KEY / USER-ID header authentication against
        // eCourier's Merchant API, per eCourier's own published API
        // documentation (ecourier.com.bd/resources).
        'api_key' => env('ECOURIER_API_KEY'),
        'api_secret' => env('ECOURIER_API_SECRET'),
        'user_id' => env('ECOURIER_USER_ID'),
        'base_url' => env('ECOURIER_BASE_URL', 'https://backend.ecourier.com.bd/api'),
    ],
];
