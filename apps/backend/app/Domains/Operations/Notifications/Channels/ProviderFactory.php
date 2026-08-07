<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Channels;

use App\Domains\Operations\Notifications\Channels\Contracts\NotificationProviderContract;
use App\Domains\Operations\Notifications\Exceptions\UnsupportedNotificationProviderException;
use Illuminate\Http\Client\Factory as HttpFactory;

/**
 * The construction half of this module's channel-provider architecture —
 * turns a provider code plus its config/notifications.php configuration
 * array into a concrete Channels\Contracts\NotificationProviderContract
 * instance. Mirrors Payments' Gateways\GatewayFactory and Shipping's
 * Couriers\ProviderFactory exactly: Providers\
 * NotificationsServiceProvider is this class's only caller, iterating
 * config/notifications.php's per-channel `providers` lists.
 *
 * Only `email` providers are registered here in this delivery — a Phase 2
 * SMS or WhatsApp provider (per the master plan's own phase split) adds
 * one new `match` arm plus a config block; nothing else in this module
 * changes, exactly as this factory's own sibling modules already
 * demonstrate for their own extension points.
 */
final readonly class ProviderFactory
{
    public function __construct(private HttpFactory $http) {}

    /**
     * @param  array<string, mixed>  $config
     */
    public function make(string $code, array $config): NotificationProviderContract
    {
        return match ($code) {
            'smtp' => new SmtpEmailProvider($config),
            'mailgun' => new MailgunEmailProvider($config, $this->http),
            'ses' => new SesEmailProvider($config),
            'brevo' => new BrevoEmailProvider($config, $this->http),
            default => throw new UnsupportedNotificationProviderException($code),
        };
    }
}
