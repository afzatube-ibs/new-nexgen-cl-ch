<?php

declare(strict_types=1);

/**
 * Installer's API surface, required from InstallerServiceProvider::boot()
 * and kept physically alongside the module that owns it, matching the
 * pattern every other module already established for its own routes.php.
 *
 * Versioned under /api/v1 per API:VERSIONING, like every other module's
 * routes — but deliberately WITHOUT `auth:sanctum` or any `permission:`
 * middleware, since this flow is necessarily pre-authentication (see
 * InstallRequest's docblock). `throttle:install` is this endpoint's actual
 * abuse guard in place of authentication.
 */

use App\Domains\Platform\Installer\Http\Controllers\InstallController;
use Illuminate\Support\Facades\Route;

// `->middleware('api')` is required here for the same reason documented in
// every other module's routes.php: this module registers routes from its
// own service provider, not bootstrap/app.php's `withRouting(api: ...)`.
Route::prefix('api/v1')->middleware('api')->group(function (): void {
    Route::get('install/status', [InstallController::class, 'status'])->name('v1.install.status');
    Route::post('install', [InstallController::class, 'store'])
        ->middleware('throttle:install')->name('v1.install.store');
});
