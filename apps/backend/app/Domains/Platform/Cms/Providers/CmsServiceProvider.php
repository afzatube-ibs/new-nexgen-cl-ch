<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Providers;

use App\Domains\Platform\Cms\Console\Commands\SyncPermissionsCommand;
use Illuminate\Support\ServiceProvider;

final class CmsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        require __DIR__.'/../routes.php';
        if ($this->app->runningInConsole()) {
            $this->commands([SyncPermissionsCommand::class]);
        }
    }
}
