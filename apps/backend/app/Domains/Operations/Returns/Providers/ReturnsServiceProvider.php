<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Providers;

use App\Domains\Operations\Returns\Console\Commands\SyncPermissionsCommand;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Returns' public contract into the platform: its routes and its
 * console command. Mirrors Fulfillment's own FulfillmentServiceProvider —
 * this module needs no container bindings of its own beyond what Platform
 * Foundation (DomainEventBus) and Shipping (Couriers\ProviderRegistry,
 * already bound by ShippingServiceProvider) already provide.
 *
 * The ReturnResolved <-> Payments RefundPaymentAction/PaymentRefunded
 * cross-domain wiring is NOT registered here — see app/Listeners/
 * ProcessRefundOnReturnResolved.php's and App\Providers\
 * AppServiceProvider's docblocks for why that subscription lives outside
 * this module's own namespace.
 */
final class ReturnsServiceProvider extends ServiceProvider
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
