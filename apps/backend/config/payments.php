<?php

declare(strict_types=1);

/**
 * MODULE:PAYMENTS' gateway configuration — SECURITY:SECRETS_MANAGEMENT made
 * concrete: every gateway credential below is sourced from the environment,
 * never stored in the database alongside payment records, and never
 * committed to version control (see .env.example for the documented, empty
 * placeholders every deployment must fill in).
 *
 * A gateway whose required credentials are absent is simply unavailable
 * (Gateways\Contracts\PaymentGatewayContract::isAvailable() returns false
 * and Gateways\GatewayResolver excludes it) — never silently half-configured
 * or falling back to a fake success. COD and Bank Transfer need no external
 * credentials at all and are therefore always available, matching this
 * module's Bangladesh-first, "COD is a first-class gateway, not a fallback"
 * requirement.
 */
return [

    /*
    |--------------------------------------------------------------------------
    | Enabled Gateways
    |--------------------------------------------------------------------------
    |
    | The ordered list of gateway codes this installation offers, resolved
    | by Gateways\GatewayFactory into concrete Gateways\Contracts\
    | PaymentGatewayContract instances and registered into Gateways\
    | GatewayRegistry by Providers\PaymentsServiceProvider::boot(). A code
    | listed here with isAvailable() === false is registered but excluded
    | from Gateways\GatewayResolver's successful resolution — it still
    | appears to administrators as "configured but incomplete," not simply
    | missing, which is the more honest failure mode per PRINCIPLES:
    | EXPLICIT_FAILURE.
    |
    */
    'gateways' => explode(',', (string) env('PAYMENTS_ENABLED_GATEWAYS', 'cod,bank_transfer,sslcommerz,bkash,nagad')),

    /*
    |--------------------------------------------------------------------------
    | Checkout Return URL
    |--------------------------------------------------------------------------
    |
    | Where a redirect-based gateway (SSLCommerz, bKash, Nagad) sends the
    | customer's browser back to after they complete, cancel, or fail a
    | hosted checkout — Actions\InitiatePaymentAction appends `/success`,
    | `/failure`, and `/cancel` (plus the payment id) to this base when
    | building each gateway's own callback URLs. This platform has no
    | storefront frontend yet (API:PHILOSOPHY — "this backend has no HTML
    | surface at all"), so this defaults to this API's own base URL; a
    | future storefront sets PAYMENTS_CHECKOUT_RETURN_URL to its own
    | domain without any change on this module's side, exactly the seam
    | Checkout's own ShippingOptionCatalog already establishes the
    | precedent for.
    |
    */
    'checkout_return_url' => env('PAYMENTS_CHECKOUT_RETURN_URL', env('APP_URL', 'http://localhost')),

    'cod' => [
        // COD-specific extension points named in the master plan's
        // Payments entry — none exercised by Phase 1's CodGateway, which
        // charges no fee and applies no eligibility rule, but every seam
        // is already named here so a future rule engine has a stable
        // configuration surface to extend rather than one it must invent.
        'fee' => env('PAYMENTS_COD_FEE', '0.0000'),
        // Future Extension Points (not implemented in Phase 1 — see
        // Gateways\CodGateway's docblock): COD by shipping zone, COD by
        // store, COD by product, COD by customer group, COD risk rules.
    ],

    'bank_transfer' => [
        // Shown to the customer as payment instructions when this gateway
        // is selected — deliberately plain configuration, not a database
        // table, since changing a bank account is an operational/deploy
        // event, not a runtime admin action, in this project's Phase 1.
        'bank_name' => env('PAYMENTS_BANK_TRANSFER_BANK_NAME'),
        'account_name' => env('PAYMENTS_BANK_TRANSFER_ACCOUNT_NAME'),
        'account_number' => env('PAYMENTS_BANK_TRANSFER_ACCOUNT_NUMBER'),
        'routing_number' => env('PAYMENTS_BANK_TRANSFER_ROUTING_NUMBER'),
        'branch' => env('PAYMENTS_BANK_TRANSFER_BRANCH'),
    ],

    'sslcommerz' => [
        'store_id' => env('SSLCOMMERZ_STORE_ID'),
        'store_password' => env('SSLCOMMERZ_STORE_PASSWORD'),
        'sandbox' => (bool) env('SSLCOMMERZ_SANDBOX', true),
        'base_url' => env('SSLCOMMERZ_SANDBOX', true)
            ? 'https://sandbox.sslcommerz.com'
            : 'https://securepay.sslcommerz.com',
    ],

    'bkash' => [
        'app_key' => env('BKASH_APP_KEY'),
        'app_secret' => env('BKASH_APP_SECRET'),
        'username' => env('BKASH_USERNAME'),
        'password' => env('BKASH_PASSWORD'),
        'sandbox' => (bool) env('BKASH_SANDBOX', true),
        'base_url' => env('BKASH_SANDBOX', true)
            ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
            : 'https://tokenized.pay.bka.sh/v1.2.0-beta',
    ],

    'nagad' => [
        'merchant_id' => env('NAGAD_MERCHANT_ID'),
        'merchant_private_key' => env('NAGAD_MERCHANT_PRIVATE_KEY'),
        'nagad_public_key' => env('NAGAD_PUBLIC_KEY'),
        'sandbox' => (bool) env('NAGAD_SANDBOX', true),
        'base_url' => env('NAGAD_SANDBOX', true)
            ? 'https://sandbox.mynagad.com:10080/remote-payment-gateway-1.0'
            : 'https://api.mynagad.com/remote-payment-gateway-1.0',
    ],

    /*
    |--------------------------------------------------------------------------
    | Reconciliation
    |--------------------------------------------------------------------------
    |
    | payments:reconcile (Console\Commands\ReconcilePaymentsCommand) only
    | queries a gateway for payments that have sat in a non-terminal status
    | longer than this, per Actions\ReconcilePaymentsAction — a freshly
    | initiated payment mid-checkout is not yet "stuck," only one that has
    | outlived a normal completion window.
    |
    */
    'reconciliation_threshold_minutes' => (int) env('PAYMENTS_RECONCILIATION_THRESHOLD_MINUTES', 30),
];
