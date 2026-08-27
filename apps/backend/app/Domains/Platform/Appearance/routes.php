<?php

declare(strict_types=1);

/**
 * Appearance's API surface — versioned under /api/v1, `auth:sanctum` plus
 * the relevant `permission:` on every route, matching every other module's
 * `routes.php`. Nested under a real Store per Laravel's own route-model
 * binding, mirroring `store-configuration/audit-logs`'s own placement
 * pattern for a module that presents as "one store's own configuration."
 */

use App\Domains\Platform\Appearance\Http\Controllers\AuditLogController;
use App\Domains\Platform\Appearance\Http\Controllers\StoreAppearanceController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    Route::get('stores/{store}/appearance', [StoreAppearanceController::class, 'show'])
        ->middleware('permission:appearance.branding.view')->name('v1.stores.appearance.show');
    Route::patch('stores/{store}/appearance', [StoreAppearanceController::class, 'update'])
        ->middleware('permission:appearance.branding.manage')->name('v1.stores.appearance.update');
    Route::post('stores/{store}/appearance/publish', [StoreAppearanceController::class, 'publish'])
        ->middleware('permission:appearance.branding.manage')->name('v1.stores.appearance.publish');
    Route::post('stores/{store}/appearance/reset', [StoreAppearanceController::class, 'reset'])
        ->middleware('permission:appearance.branding.manage')->name('v1.stores.appearance.reset');

    Route::get('appearance/audit-logs', [AuditLogController::class, 'index'])
        ->middleware('permission:appearance.audit_log.view')->name('v1.appearance.audit-logs.index');
});
