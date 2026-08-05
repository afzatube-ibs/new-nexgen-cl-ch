<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Providers;

use App\Domains\Commerce\Checkout\Console\Commands\ExpireCheckoutSessionsCommand;
use App\Domains\Commerce\Checkout\Console\Commands\SyncPermissionsCommand;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Checkout's public contract into the platform: its routes and its
 * console commands. Mirrors every other module's own service provider —
 * this module needs no container bindings of its own (its dependencies —
 * DomainEventBus, Identity & Access's `permission:` middleware, and every
 * other module's own Actions it orchestrates — are already bound by their
 * owning providers).
 */
final class CheckoutServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        require __DIR__.'/../routes.php';

        if ($this->app->runningInConsole()) {
            $this->commands([
                SyncPermissionsCommand::class,
                ExpireCheckoutSessionsCommand::class,
            ]);
        }
    }
}
