<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Providers;

use App\Domains\Commerce\Customers\Console\Commands\SyncPermissionsCommand;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Customers' public contract into the platform: its routes and its
 * console command. Mirrors Catalog's own CatalogServiceProvider — this
 * module needs no container bindings of its own (its dependencies,
 * DomainEventBus and Identity & Access's `permission:` middleware, are
 * already bound by Platform Foundation's and Identity & Access's own
 * providers).
 */
final class CustomersServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Production Completion Plan v2, Milestone 5b (Password Reset) —
        // deliberately its own, tighter limiter than IdentityAccess's own
        // `login` (reused as-is by `customers/login`, see Customers'
        // routes.php docblock): a forgot-password request sends a real
        // email to a third party, an abuse vector `login` attempts (which
        // only ever affect the caller's own feedback) don't share — an
        // attacker with a target's email could otherwise email-bomb them
        // by repeatedly requesting a reset. Keyed by email|ip, same
        // construction as `login`.
        RateLimiter::for('password-reset', function ($request) {
            return Limit::perMinute(3)->by($request->string('email').'|'.$request->ip());
        });

        require __DIR__.'/../routes.php';

        if ($this->app->runningInConsole()) {
            $this->commands([
                SyncPermissionsCommand::class,
            ]);
        }
    }
}
