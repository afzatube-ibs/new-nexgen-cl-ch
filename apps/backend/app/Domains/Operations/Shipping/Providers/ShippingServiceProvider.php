<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Providers;

use App\Domains\Operations\Shipping\Console\Commands\SyncPermissionsCommand;
use App\Domains\Operations\Shipping\Couriers\ProviderFactory;
use App\Domains\Operations\Shipping\Couriers\ProviderRegistry;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Shipping's public contract into the platform: its courier
 * registry, its routes, and its console command. Mirrors Payments'
 * PaymentsServiceProvider exactly — see that class's docblock for the
 * identical rationale, including why `ProviderRegistry` is bound as a
 * singleton and populated here, once, from config('shipping.providers')
 * via Couriers\ProviderFactory.
 */
final class ShippingServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ProviderRegistry::class, function ($app) {
            $registry = new ProviderRegistry;
            $factory = $app->make(ProviderFactory::class);

            /** @var list<string> $providerCodes */
            $providerCodes = config('shipping.providers', []);

            foreach ($providerCodes as $code) {
                $code = trim($code);

                if ($code === '') {
                    continue;
                }

                /** @var array<string, mixed> $providerConfig */
                $providerConfig = config("shipping.{$code}", []);

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
