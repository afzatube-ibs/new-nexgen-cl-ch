<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Providers;

use App\Domains\Operations\Fulfillment\Console\Commands\SyncPermissionsCommand;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Fulfillment's public contract into the platform: its routes and
 * its console command. Mirrors Shipping's own ShippingServiceProvider —
 * this module needs no container bindings of its own beyond what Platform
 * Foundation (DomainEventBus) and Shipping (Couriers\ProviderRegistry,
 * already bound by ShippingServiceProvider) already provide.
 *
 * The OrderPlaced -> Shipment reaction is NOT wired here — see
 * app/Listeners/CreateShipmentOnOrderPlaced.php's and App\Providers\
 * AppServiceProvider's docblocks for why that subscription is registered
 * outside this module's own namespace.
 */
final class FulfillmentServiceProvider extends ServiceProvider
{
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
