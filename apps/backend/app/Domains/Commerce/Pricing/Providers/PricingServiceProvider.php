<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Providers;

use App\Domains\Commerce\Pricing\Console\Commands\SyncPermissionsCommand;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Pricing's public contract into the platform: its routes and its
 * console command. Mirrors Catalog's own CatalogServiceProvider — this
 * module needs no container bindings of its own (its dependencies,
 * DomainEventBus and Identity & Access's `permission:` middleware, are
 * already bound by Platform Foundation's and Identity & Access's own
 * providers).
 */
final class PricingServiceProvider extends ServiceProvider
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
