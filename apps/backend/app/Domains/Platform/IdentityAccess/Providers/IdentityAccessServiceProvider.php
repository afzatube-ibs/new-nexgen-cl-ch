<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Providers;

use App\Domains\Platform\IdentityAccess\Console\Commands\CreateAdminCommand;
use App\Domains\Platform\IdentityAccess\Console\Commands\CreateServiceAccountCommand;
use App\Domains\Platform\IdentityAccess\Console\Commands\SyncPermissionsCommand;
use App\Domains\Platform\IdentityAccess\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Identity & Access's public contract into the platform: the Gate
 * hook every `$user->can(...)` / `permission:` middleware check resolves
 * through (SECURITY:AUTHORIZATION — "no module performs its own bespoke,
 * disconnected permission logic," this is the one place that logic lives),
 * the login rate limiter (SECURITY:RATE_LIMITING_ABUSE), and this module's
 * routes and console commands.
 */
final class IdentityAccessServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::before(function (User $user, string $ability): ?bool {
            return $user->hasPermission($ability) ? true : null;
        });

        // Keyed by identifier+IP, not IP alone: an attacker rotating IPs
        // against one identifier is still throttled, and one IP's
        // legitimate users on a shared connection (e.g. an office NAT)
        // don't lock each other out. Shared across staff login (always
        // `email`) and Customer login (Phase 4.0 Slice 4.1 renamed its
        // own field to `identifier` — phone- or email-shaped) — falls
        // back to `identifier` only when `email` is absent, so staff
        // behavior is byte-for-byte unchanged.
        RateLimiter::for('login', function ($request) {
            $key = $request->string('email')->toString() ?: $request->string('identifier')->toString();

            return Limit::perMinute(5)->by($key.'|'.$request->ip());
        });

        require __DIR__.'/../routes.php';

        if ($this->app->runningInConsole()) {
            $this->commands([
                SyncPermissionsCommand::class,
                CreateAdminCommand::class,
                CreateServiceAccountCommand::class,
            ]);
        }
    }
}
