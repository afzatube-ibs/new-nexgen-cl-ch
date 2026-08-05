<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Providers;

use App\Domains\Commerce\Orders\Console\Commands\SyncPermissionsCommand;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Orders' public contract into the platform: its routes and its
 * console command. Mirrors Pricing's and Promotions' own service
 * providers — this module needs no container bindings of its own.
 */
final class OrdersServiceProvider extends ServiceProvider
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
