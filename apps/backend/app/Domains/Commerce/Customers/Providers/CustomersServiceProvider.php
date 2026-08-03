<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Providers;

use App\Domains\Commerce\Customers\Console\Commands\SyncPermissionsCommand;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Customers' public contract into the platform: its routes and its
 * console command. Mirrors Catalog's own CatalogServiceProvider — this
 * module needs no container bindings of its own (its dependencies,
 * DomainEventBus and Identity & Access's `permission:` middleware, are
 * already bound by Platform Foundation's and Identity & Access's own
 * providers).
 */
final class CustomersServiceProvider extends ServiceProvider
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
