<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Channels;

use App\Domains\Operations\Notifications\Channels\Contracts\NotificationProviderContract;

/**
 * The storage half of "Provider Registry / Provider Resolver" — holds
 * every channel provider Providers\NotificationsServiceProvider
 * constructed via Channels\ProviderFactory from
 * config/notifications.php, keyed by each provider's own
 * NotificationProviderContract::code(). Mirrors Payments' Gateways\
 * GatewayRegistry and Shipping's Couriers\ProviderRegistry exactly,
 * including registering regardless of isAvailable().
 */
final class ProviderRegistry
{
    /**
     * @var array<string, NotificationProviderContract>
     */
    private array $providers = [];

    public function register(NotificationProviderContract $provider): void
    {
        $this->providers[$provider->code()] = $provider;
    }

    public function has(string $code): bool
    {
        return array_key_exists($code, $this->providers);
    }

    public function get(string $code): ?NotificationProviderContract
    {
        return $this->providers[$code] ?? null;
    }

    /**
     * @return array<string, NotificationProviderContract>
     */
    public function all(): array
    {
        return $this->providers;
    }

    /**
     * @return list<NotificationProviderContract>
     */
    public function forChannel(string $channel): array
    {
        return array_values(array_filter(
            $this->providers,
            static fn (NotificationProviderContract $provider): bool => $provider->channel() === $channel,
        ));
    }
}
