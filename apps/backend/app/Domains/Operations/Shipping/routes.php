<?php

declare(strict_types=1);

/**
 * Shipping's API surface, required from Providers\ShippingServiceProvider
 * ::boot(), kept physically alongside the module that owns it, matching
 * the pattern every prior module already established.
 *
 * Versioned under /api/v1 per API:VERSIONING. Every route requires
 * `auth:sanctum` plus the specific `permission:` its operation corresponds
 * to (SECURITY:ROLES_PERMISSIONS), reusing Identity & Access's public
 * `permission:` middleware exactly as every prior module does.
 *
 * `shipping/quote`, `shipping/providers`, and `shipping/audit-logs` are
 * registered before their respective resourceful groups purely for
 * readability, mirroring Pricing's own routes.php ordering rationale.
 */

use App\Domains\Operations\Shipping\Http\Controllers\AuditLogController;
use App\Domains\Operations\Shipping\Http\Controllers\ShippingMethodController;
use App\Domains\Operations\Shipping\Http\Controllers\ShippingProviderController;
use App\Domains\Operations\Shipping\Http\Controllers\ShippingRateController;
use App\Domains\Operations\Shipping\Http\Controllers\ShippingRateQuoteController;
use App\Domains\Operations\Shipping\Http\Controllers\ShippingZoneController;
use Illuminate\Support\Facades\Route;

// `->middleware('api')` is required here for the same reason documented in
// every prior module's routes.php: this module registers routes from its
// own service provider, not bootstrap/app.php's `withRouting(api: ...)`.
Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    Route::post('shipping/quote', ShippingRateQuoteController::class)
        ->middleware('permission:shipping.rates.view')->name('v1.shipping.quote');

    Route::get('shipping/providers', [ShippingProviderController::class, 'index'])
        ->middleware('permission:shipping.providers.view')->name('v1.shipping.providers.index');

    Route::get('shipping/audit-logs', [AuditLogController::class, 'index'])
        ->middleware('permission:shipping.audit_log.view')->name('v1.shipping.audit-logs.index');

    Route::get('shipping-zones', [ShippingZoneController::class, 'index'])
        ->middleware('permission:shipping.zones.view')->name('v1.shipping-zones.index');
    Route::post('shipping-zones', [ShippingZoneController::class, 'store'])
        ->middleware('permission:shipping.zones.manage')->name('v1.shipping-zones.store');
    Route::get('shipping-zones/{shippingZone}', [ShippingZoneController::class, 'show'])
        ->middleware('permission:shipping.zones.view')->name('v1.shipping-zones.show');
    Route::patch('shipping-zones/{shippingZone}', [ShippingZoneController::class, 'update'])
        ->middleware('permission:shipping.zones.manage')->name('v1.shipping-zones.update');
    Route::post('shipping-zones/{shippingZone}/archive', [ShippingZoneController::class, 'archive'])
        ->middleware('permission:shipping.zones.manage')->name('v1.shipping-zones.archive');
    Route::delete('shipping-zones/{shippingZone}', [ShippingZoneController::class, 'destroy'])
        ->middleware('permission:shipping.zones.manage')->name('v1.shipping-zones.destroy');

    Route::get('shipping-methods', [ShippingMethodController::class, 'index'])
        ->middleware('permission:shipping.methods.view')->name('v1.shipping-methods.index');
    Route::post('shipping-methods', [ShippingMethodController::class, 'store'])
        ->middleware('permission:shipping.methods.manage')->name('v1.shipping-methods.store');
    Route::get('shipping-methods/{shippingMethod}', [ShippingMethodController::class, 'show'])
        ->middleware('permission:shipping.methods.view')->name('v1.shipping-methods.show');
    Route::patch('shipping-methods/{shippingMethod}', [ShippingMethodController::class, 'update'])
        ->middleware('permission:shipping.methods.manage')->name('v1.shipping-methods.update');
    Route::post('shipping-methods/{shippingMethod}/archive', [ShippingMethodController::class, 'archive'])
        ->middleware('permission:shipping.methods.manage')->name('v1.shipping-methods.archive');
    Route::delete('shipping-methods/{shippingMethod}', [ShippingMethodController::class, 'destroy'])
        ->middleware('permission:shipping.methods.manage')->name('v1.shipping-methods.destroy');

    Route::get('shipping-rates', [ShippingRateController::class, 'index'])
        ->middleware('permission:shipping.rates.view')->name('v1.shipping-rates.index');
    Route::post('shipping-rates', [ShippingRateController::class, 'store'])
        ->middleware('permission:shipping.rates.manage')->name('v1.shipping-rates.store');
    Route::get('shipping-rates/{shippingRate}', [ShippingRateController::class, 'show'])
        ->middleware('permission:shipping.rates.view')->name('v1.shipping-rates.show');
    Route::patch('shipping-rates/{shippingRate}', [ShippingRateController::class, 'update'])
        ->middleware('permission:shipping.rates.manage')->name('v1.shipping-rates.update');
    Route::post('shipping-rates/{shippingRate}/archive', [ShippingRateController::class, 'archive'])
        ->middleware('permission:shipping.rates.manage')->name('v1.shipping-rates.archive');
    Route::delete('shipping-rates/{shippingRate}', [ShippingRateController::class, 'destroy'])
        ->middleware('permission:shipping.rates.manage')->name('v1.shipping-rates.destroy');
});
