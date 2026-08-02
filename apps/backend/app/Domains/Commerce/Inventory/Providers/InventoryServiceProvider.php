<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Providers;

use App\Domains\Commerce\Inventory\Console\Commands\SyncPermissionsCommand;
use Illuminate\Support\ServiceProvider;

final class InventoryServiceProvider extends ServiceProvider
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
