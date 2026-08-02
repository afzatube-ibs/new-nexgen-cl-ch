<?php

declare(strict_types=1);

namespace App\Domains\Platform\Foundation\Providers;

use App\Domains\Platform\Foundation\Console\Commands\PlatformHealthCommand;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use App\Domains\Platform\Foundation\EventBus\LaravelDomainEventBus;
use App\Domains\Platform\Foundation\Health\Checks\CacheHealthCheck;
use App\Domains\Platform\Foundation\Health\Checks\DatabaseHealthCheck;
use App\Domains\Platform\Foundation\Health\Checks\QueueHealthCheck;
use App\Domains\Platform\Foundation\Health\HealthCheckService;
use App\Domains\Platform\Foundation\Http\Controllers\HealthController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Platform Foundation's public contract into the container: the
 * DomainEventBus binding every other module depends on
 * (ARCH:CROSS_DOMAIN_COMMUNICATION), the health check surface
 * (ARCH:NFR / DEPLOYMENT:OPERATIONAL_READINESS), and Platform Foundation's
 * own console command.
 *
 * Per MODULE:PUBLIC_CONTRACT, this is the one place Platform Foundation
 * declares what it makes available to the rest of the platform — everything
 * else in this module is private implementation.
 */
final class FoundationServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Bound to the concrete class, not a closure that resolves
        // Dispatcher itself — the container autowires LaravelDomainEventBus's
        // constructor. This keeps this provider from needing to import
        // Illuminate's dispatcher at all, so deptrac.yaml's rule that only
        // App\Domains\Platform\Foundation\EventBus\* may depend on it holds
        // with no composition-root exception carved out for this file.
        $this->app->singleton(DomainEventBus::class, LaravelDomainEventBus::class);

        $this->app->singleton(HealthCheckService::class, fn ($app) => new HealthCheckService([
            $app->make(DatabaseHealthCheck::class),
            $app->make(CacheHealthCheck::class),
            $app->make(QueueHealthCheck::class),
        ]));
    }

    public function boot(): void
    {
        Route::get('/api/health', HealthController::class)->name('platform.health');

        if ($this->app->runningInConsole()) {
            $this->commands([
                PlatformHealthCommand::class,
            ]);
        }
    }
}
