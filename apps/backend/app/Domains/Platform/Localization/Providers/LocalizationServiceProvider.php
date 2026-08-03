<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Providers;

use App\Domains\Platform\Localization\Console\Commands\SyncPermissionsCommand;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Localization & Currency's public contract into the platform: its
 * routes and its console command. Mirrors Store Configuration's
 * StoreConfigurationServiceProvider — this module needs no container
 * bindings of its own (its dependencies, DomainEventBus and Identity &
 * Access's `permission:` middleware, are already bound by Platform
 * Foundation's and Identity & Access's own providers).
 */
final class LocalizationServiceProvider extends ServiceProvider
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
