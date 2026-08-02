<?php

declare(strict_types=1);

namespace App\Domains\Platform\Media\Providers;

use App\Domains\Platform\Media\Console\Commands\SyncPermissionsCommand;
use Illuminate\Support\ServiceProvider;

final class MediaServiceProvider extends ServiceProvider
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
