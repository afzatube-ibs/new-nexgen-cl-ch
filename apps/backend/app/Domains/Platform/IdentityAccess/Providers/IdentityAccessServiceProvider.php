<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Providers;

use App\Domains\Platform\IdentityAccess\Console\Commands\CreateAdminCommand;
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

        // Keyed by email+IP, not IP alone: an attacker rotating IPs against
        // one email is still throttled, and one IP's legitimate users on a
        // shared connection (e.g. an office NAT) don't lock each other out.
        RateLimiter::for('login', function ($request) {
            return Limit::perMinute(5)->by($request->string('email').'|'.$request->ip());
        });

        require __DIR__.'/../routes.php';

        if ($this->app->runningInConsole()) {
            $this->commands([
                SyncPermissionsCommand::class,
                CreateAdminCommand::class,
            ]);
        }
    }
}
