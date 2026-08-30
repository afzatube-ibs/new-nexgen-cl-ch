<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Providers;

use App\Domains\Commerce\Reviews\Console\Commands\SyncPermissionsCommand;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Reviews' public contract into the platform: its routes and its
 * console command. Mirrors Returns' own ReturnsServiceProvider — this
 * module needs no container bindings of its own beyond what Platform
 * Foundation (DomainEventBus) already provides.
 */
final class ReviewsServiceProvider extends ServiceProvider
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
