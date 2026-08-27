<?php

declare(strict_types=1);

namespace App\Domains\Platform\Appearance\Providers;

use App\Domains\Platform\Appearance\Console\Commands\SyncPermissionsCommand;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Appearance's routes and console command into the platform.
 * Mirrors `StoreConfigurationServiceProvider` exactly.
 */
final class AppearanceServiceProvider extends ServiceProvider
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
