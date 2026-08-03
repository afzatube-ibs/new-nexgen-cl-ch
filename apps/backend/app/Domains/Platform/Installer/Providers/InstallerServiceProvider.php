<?php

declare(strict_types=1);

namespace App\Domains\Platform\Installer\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

/**
 * Wires Installer's public contract into the platform: its routes and its
 * rate limiter. This module needs no permission registry or console
 * command — every capability it exposes is deliberately reachable without
 * authentication (see InstallRequest's docblock), so there is no
 * permission to define or seed.
 */
final class InstallerServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // SECURITY:RATE_LIMITING_ABUSE applied to the one unauthenticated,
        // world-reachable write endpoint this platform has — mirrors
        // Identity & Access's own 'login' limiter (see
        // IdentityAccessServiceProvider). Keyed by IP alone: no account
        // exists yet to key on, unlike login.
        RateLimiter::for('install', function ($request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        require __DIR__.'/../routes.php';
    }
}
