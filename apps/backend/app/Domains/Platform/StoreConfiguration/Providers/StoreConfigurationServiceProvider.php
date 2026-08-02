<?php

declare(strict_types=1);

namespace App\Domains\Platform\StoreConfiguration\Providers;

use App\Domains\Platform\StoreConfiguration\Console\Commands\SyncPermissionsCommand;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Store Configuration's public contract into the platform: its
 * routes and its console command. Mirrors Identity & Access's
 * IdentityAccessServiceProvider — this module needs no container bindings
 * of its own (its dependencies, DomainEventBus and Identity & Access's
 * `permission:` middleware, are already bound by Platform Foundation's and
 * Identity & Access's own providers).
 */
final class StoreConfigurationServiceProvider extends ServiceProvider
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
