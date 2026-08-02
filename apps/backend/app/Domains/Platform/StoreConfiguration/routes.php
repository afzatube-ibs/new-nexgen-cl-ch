<?php

declare(strict_types=1);

/**
 * Store Configuration's API surface, required from
 * StoreConfigurationServiceProvider::boot() and kept physically alongside
 * the module that owns it, matching the pattern Identity & Access already
 * established for its own routes.php.
 *
 * Versioned under /api/v1 per API:VERSIONING. Every route requires
 * `auth:sanctum` (API:AUTHENTICATION's single point, owned by Identity &
 * Access) plus the specific `permission:` its operation corresponds to
 * (SECURITY:ROLES_PERMISSIONS) — the same reusable middleware Identity &
 * Access's EnsurePermission exposes for every Platform-dependent module.
 */

use App\Domains\Platform\StoreConfiguration\Http\Controllers\AuditLogController;
use App\Domains\Platform\StoreConfiguration\Http\Controllers\StoreController;
use Illuminate\Support\Facades\Route;

// `->middleware('api')` is required here for the same reason documented in
// Identity & Access's routes.php: this module registers routes from its
// own service provider, not bootstrap/app.php's `withRouting(api: ...)`,
// so the `api` group (and its SubstituteBindings) is not applied for free.
Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    Route::get('stores', [StoreController::class, 'index'])
        ->middleware('permission:store_configuration.stores.view')->name('v1.stores.index');
    Route::post('stores', [StoreController::class, 'store'])
        ->middleware('permission:store_configuration.stores.manage')->name('v1.stores.store');
    Route::get('stores/{store}', [StoreController::class, 'show'])
        ->middleware('permission:store_configuration.stores.view')->name('v1.stores.show');
    Route::patch('stores/{store}', [StoreController::class, 'update'])
        ->middleware('permission:store_configuration.stores.manage')->name('v1.stores.update');
    Route::post('stores/{store}/archive', [StoreController::class, 'archive'])
        ->middleware('permission:store_configuration.stores.manage')->name('v1.stores.archive');
    Route::delete('stores/{store}', [StoreController::class, 'destroy'])
        ->middleware('permission:store_configuration.stores.manage')->name('v1.stores.destroy');

    Route::get('store-configuration/audit-logs', [AuditLogController::class, 'index'])
        ->middleware('permission:store_configuration.audit_log.view')->name('v1.store-configuration.audit-logs.index');
});
