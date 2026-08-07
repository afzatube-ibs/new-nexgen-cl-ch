<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Channels;

use App\Domains\Operations\Notifications\Channels\Contracts\NotificationProviderContract;
use App\Domains\Operations\Notifications\Exceptions\UnsupportedNotificationProviderException;

/**
 * The lookup-with-validation half of "Provider Registry / Provider
 * Resolver" — mirrors Payments' Gateways\GatewayResolver and Shipping's
 * Couriers\ProviderResolver exactly: every Action that needs to send
 * through a provider goes through this class, never ProviderRegistry
 * directly, so "unregistered" and "registered but unavailable" are both
 * refused in exactly one place.
 */
final readonly class ProviderResolver
{
    public function __construct(private ProviderRegistry $registry) {}

    /**
     * @throws UnsupportedNotificationProviderException when the provider
     *                                                  is unknown or
     *                                                  currently
     *                                                  unavailable (see
     *                                                  NotificationProviderContract::isAvailable()).
     */
    public function resolve(string $code): NotificationProviderContract
    {
        $provider = $this->registry->get($code);

        if ($provider === null || ! $provider->isAvailable()) {
            throw new UnsupportedNotificationProviderException($code);
        }

        return $provider;
    }

    /**
     * The first available provider registered for a channel — the
     * default resolution path Actions\SendNotificationAction uses when a
     * Notification does not name a specific provider_code, mirroring how
     * a deployment configures one primary email provider at a time.
     *
     * @throws UnsupportedNotificationProviderException when no provider
     *                                                  is available for
     *                                                  this channel.
     */
    public function resolveForChannel(string $channel): NotificationProviderContract
    {
        foreach ($this->registry->forChannel($channel) as $provider) {
            if ($provider->isAvailable()) {
                return $provider;
            }
        }

        throw new UnsupportedNotificationProviderException($channel);
    }

    /**
     * @return list<NotificationProviderContract>
     */
    public function availableProviders(): array
    {
        return array_values(array_filter(
            $this->registry->all(),
            static fn (NotificationProviderContract $provider): bool => $provider->isAvailable(),
        ));
    }

    /**
     * @return list<NotificationProviderContract>
     */
    public function allProviders(): array
    {
        return array_values($this->registry->all());
    }
}
