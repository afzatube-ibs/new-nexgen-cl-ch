<?php

declare(strict_types=1);

/**
 * Localization & Currency's API surface, required from
 * LocalizationServiceProvider::boot() and kept physically alongside the
 * module that owns it, matching the pattern Store Configuration already
 * established for its own routes.php.
 *
 * Versioned under /api/v1 per API:VERSIONING. Every route requires
 * `auth:sanctum` (API:AUTHENTICATION's single point, owned by Identity &
 * Access) plus the specific `permission:` its operation corresponds to
 * (SECURITY:ROLES_PERMISSIONS) — the same reusable middleware Identity &
 * Access's EnsurePermission exposes for every Platform-dependent module.
 */

use App\Domains\Platform\Localization\Http\Controllers\AuditLogController;
use App\Domains\Platform\Localization\Http\Controllers\CurrencyController;
use App\Domains\Platform\Localization\Http\Controllers\LocaleController;
use Illuminate\Support\Facades\Route;

// `->middleware('api')` is required here for the same reason documented in
// Store Configuration's routes.php: this module registers routes from its
// own service provider, not bootstrap/app.php's `withRouting(api: ...)`,
// so the `api` group (and its SubstituteBindings) is not applied for free.
Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    Route::get('locales', [LocaleController::class, 'index'])
        ->middleware('permission:localization.locales.view')->name('v1.locales.index');
    Route::post('locales', [LocaleController::class, 'store'])
        ->middleware('permission:localization.locales.manage')->name('v1.locales.store');
    Route::get('locales/{locale}', [LocaleController::class, 'show'])
        ->middleware('permission:localization.locales.view')->name('v1.locales.show');
    Route::patch('locales/{locale}', [LocaleController::class, 'update'])
        ->middleware('permission:localization.locales.manage')->name('v1.locales.update');
    Route::post('locales/{locale}/archive', [LocaleController::class, 'archive'])
        ->middleware('permission:localization.locales.manage')->name('v1.locales.archive');
    Route::delete('locales/{locale}', [LocaleController::class, 'destroy'])
        ->middleware('permission:localization.locales.manage')->name('v1.locales.destroy');

    Route::get('currencies', [CurrencyController::class, 'index'])
        ->middleware('permission:localization.currencies.view')->name('v1.currencies.index');
    Route::post('currencies', [CurrencyController::class, 'store'])
        ->middleware('permission:localization.currencies.manage')->name('v1.currencies.store');
    Route::get('currencies/{currency}', [CurrencyController::class, 'show'])
        ->middleware('permission:localization.currencies.view')->name('v1.currencies.show');
    Route::patch('currencies/{currency}', [CurrencyController::class, 'update'])
        ->middleware('permission:localization.currencies.manage')->name('v1.currencies.update');
    Route::post('currencies/{currency}/archive', [CurrencyController::class, 'archive'])
        ->middleware('permission:localization.currencies.manage')->name('v1.currencies.archive');
    Route::delete('currencies/{currency}', [CurrencyController::class, 'destroy'])
        ->middleware('permission:localization.currencies.manage')->name('v1.currencies.destroy');

    Route::get('localization/audit-logs', [AuditLogController::class, 'index'])
        ->middleware('permission:localization.audit_log.view')->name('v1.localization.audit-logs.index');
});
