<?php

declare(strict_types=1);

/**
 * MODULE:NOTIFICATIONS' channel-provider configuration —
 * SECURITY:SECRETS_MANAGEMENT made concrete: every provider credential
 * below is sourced from the environment, never stored in the database,
 * and never committed to version control.
 *
 * A provider whose required credentials are absent is simply unavailable
 * (Channels\Contracts\NotificationProviderContract::isAvailable() returns
 * false and Channels\ProviderResolver excludes it) — never silently
 * half-configured or falling back to a fake success, mirroring
 * config/payments.php and config/shipping.php exactly.
 *
 * Only `email` has a real provider list wired in this delivery — Phase 1
 * per the master plan's own "Phase 1 (Notifications + Email) / Phase 2
 * (SMS, WhatsApp)" split. `sms` and `whatsapp` are named here as the
 * seam a Phase 2 delivery extends (Channels\Contracts\
 * NotificationProviderContract already supports any channel), not
 * implemented now — no OneCodeSoft, SSL Wireless, BulkSMSBD, or Meta
 * WhatsApp Cloud API credentials are read anywhere in this codebase.
 */
return [

    /*
    |--------------------------------------------------------------------------
    | Enabled Email Providers
    |--------------------------------------------------------------------------
    |
    | The ordered list of email provider codes this installation offers,
    | resolved by Channels\ProviderFactory into concrete Channels\
    | Contracts\NotificationProviderContract instances and registered into
    | Channels\ProviderRegistry by Providers\NotificationsServiceProvider
    | ::boot(). A code listed here with isAvailable() === false is
    | registered but excluded from Channels\ProviderResolver's successful
    | resolution.
    |
    */
    'email_providers' => explode(',', (string) env('NOTIFICATIONS_ENABLED_EMAIL_PROVIDERS', 'smtp,mailgun,ses,brevo')),

    /*
    |--------------------------------------------------------------------------
    | Default Email Provider
    |--------------------------------------------------------------------------
    |
    | Which registered, available email provider Actions\
    | SendNotificationAction resolves when a Notification does not name
    | one explicitly. Channels\ProviderResolver::resolveForChannel()
    | falls back to the first available provider on the channel's list if
    | this one is not currently available.
    |
    */
    'default_email_provider' => env('NOTIFICATIONS_DEFAULT_EMAIL_PROVIDER', 'smtp'),

    'smtp' => [
        'host' => env('NOTIFICATIONS_SMTP_HOST'),
        'port' => (int) env('NOTIFICATIONS_SMTP_PORT', 587),
        'encryption' => env('NOTIFICATIONS_SMTP_ENCRYPTION', 'tls'),
        'username' => env('NOTIFICATIONS_SMTP_USERNAME'),
        'password' => env('NOTIFICATIONS_SMTP_PASSWORD'),
        'from_address' => env('NOTIFICATIONS_SMTP_FROM_ADDRESS'),
        'from_name' => env('NOTIFICATIONS_SMTP_FROM_NAME'),
    ],

    'mailgun' => [
        'api_key' => env('MAILGUN_API_KEY'),
        'domain' => env('MAILGUN_DOMAIN'),
        'region' => env('MAILGUN_REGION', 'us'),
        'from_address' => env('MAILGUN_FROM_ADDRESS'),
        'from_name' => env('MAILGUN_FROM_NAME'),
    ],

    'ses' => [
        'region' => env('SES_REGION', 'us-east-1'),
        'port' => (int) env('SES_SMTP_PORT', 587),
        'smtp_username' => env('SES_SMTP_USERNAME'),
        'smtp_password' => env('SES_SMTP_PASSWORD'),
        'from_address' => env('SES_FROM_ADDRESS'),
        'from_name' => env('SES_FROM_NAME'),
    ],

    'brevo' => [
        'api_key' => env('BREVO_API_KEY'),
        'from_address' => env('BREVO_FROM_ADDRESS'),
        'from_name' => env('BREVO_FROM_NAME'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Retry Policy
    |--------------------------------------------------------------------------
    |
    | "Notification Queue... Retry Policy" from the master plan's own
    | data ownership. `max_attempts` seeds Models\Notification::
    | $max_attempts at queue time; `backoff_seconds` is the delay before
    | each successive retry (index 0 = delay before the 2nd attempt, and
    | so on) — Actions\SendNotificationAction reads the entry at
    | `attempts_count - 1`, clamped to the last entry once attempts exceed
    | the table's own length, so retries always keep backing off rather
    | than reverting to an aggressive interval.
    |
    */
    'retry' => [
        'max_attempts' => (int) env('NOTIFICATIONS_MAX_ATTEMPTS', 5),
        'backoff_seconds' => [60, 300, 900, 3600, 21600],
    ],

    /*
    |--------------------------------------------------------------------------
    | Queue Connection
    |--------------------------------------------------------------------------
    |
    | Which queue connection (config/queue.php) Jobs\SendNotificationJob
    | dispatches onto — ADR-0004's Redis-backed queue backbone by default,
    | kept a named override here (rather than hardcoded) so a future
    | dedicated notifications queue/worker pool is a configuration change,
    | not a code change.
    |
    */
    'queue_connection' => env('NOTIFICATIONS_QUEUE_CONNECTION', env('QUEUE_CONNECTION', 'redis')),
    'queue_name' => env('NOTIFICATIONS_QUEUE_NAME', 'notifications'),
];
