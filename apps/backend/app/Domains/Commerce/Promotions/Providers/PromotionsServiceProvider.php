<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Providers;

use App\Domains\Commerce\Promotions\Console\Commands\SyncPermissionsCommand;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Promotions' public contract into the platform: its routes and its
 * console command. Mirrors Pricing's own PricingServiceProvider — this
 * module needs no container bindings of its own (its dependencies,
 * DomainEventBus and Identity & Access's `permission:` middleware, are
 * already bound by Platform Foundation's and Identity & Access's own
 * providers).
 */
final class PromotionsServiceProvider extends ServiceProvider
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
