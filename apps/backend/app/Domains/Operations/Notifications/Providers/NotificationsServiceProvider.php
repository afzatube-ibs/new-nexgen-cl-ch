<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Providers;

use App\Domains\Operations\Notifications\Channels\ProviderFactory;
use App\Domains\Operations\Notifications\Channels\ProviderRegistry;
use App\Domains\Operations\Notifications\Console\Commands\SyncPermissionsCommand;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Notifications' public contract into the platform: its
 * channel-provider registry, its routes, and its console commands.
 *
 * `ProviderRegistry` is bound as a singleton and populated here, once,
 * from config('notifications.email_providers') via Channels\
 * ProviderFactory — mirrors Payments' Providers\PaymentsServiceProvider
 * and Shipping's Providers\ShippingServiceProvider exactly.
 */
final class NotificationsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ProviderRegistry::class, function ($app) {
            $registry = new ProviderRegistry;
            $factory = $app->make(ProviderFactory::class);

            /** @var list<string> $providerCodes */
            $providerCodes = config('notifications.email_providers', []);

            foreach ($providerCodes as $code) {
                $code = trim($code);

                if ($code === '') {
                    continue;
                }

                /** @var array<string, mixed> $providerConfig */
                $providerConfig = config("notifications.{$code}", []);

                $registry->register($factory->make($code, $providerConfig));
            }

            return $registry;
        });
    }

    public function boot(): void
    {
        require __DIR__.'/../routes.php';

        if ($this->app->runningInConsole()) {
            $this->commands([
                SyncPermissionsCommand::class,
            ]);
        }
    }
}
