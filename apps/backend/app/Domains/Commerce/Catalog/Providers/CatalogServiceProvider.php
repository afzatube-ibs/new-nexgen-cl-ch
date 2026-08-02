<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Providers;

use App\Domains\Commerce\Catalog\Console\Commands\SyncPermissionsCommand;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Catalog's public contract into the platform: its routes and its
 * console command. Mirrors Store Configuration's own
 * StoreConfigurationServiceProvider — this module needs no container
 * bindings of its own (its dependencies, DomainEventBus and Identity &
 * Access's `permission:` middleware, are already bound by Platform
 * Foundation's and Identity & Access's own providers).
 */
final class CatalogServiceProvider extends ServiceProvider
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
