<?php

declare(strict_types=1);

/**
 * Pricing's API surface, required from PricingServiceProvider::boot() and
 * kept physically alongside the module that owns it, matching the pattern
 * every prior module already established.
 *
 * Versioned under /api/v1 per API:VERSIONING. Every route requires
 * `auth:sanctum` plus the specific `permission:` its operation corresponds
 * to (SECURITY:ROLES_PERMISSIONS), reusing Identity & Access's public
 * `permission:` middleware exactly as every prior module does.
 *
 * `pricing/lookup`, `tax/calculate`, and `pricing/audit-logs` are
 * registered before their respective resourceful groups purely for
 * readability — none of them share a URI prefix with a {parameter}
 * segment that could otherwise swallow them, unlike Customers' own
 * audit-logs-before-{customer} ordering requirement.
 */

use App\Domains\Commerce\Pricing\Http\Controllers\AuditLogController;
use App\Domains\Commerce\Pricing\Http\Controllers\PriceListController;
use App\Domains\Commerce\Pricing\Http\Controllers\PriceListEntryController;
use App\Domains\Commerce\Pricing\Http\Controllers\PriceLookupController;
use App\Domains\Commerce\Pricing\Http\Controllers\TaxCalculationController;
use App\Domains\Commerce\Pricing\Http\Controllers\TaxClassController;
use App\Domains\Commerce\Pricing\Http\Controllers\TaxRateController;
use App\Domains\Commerce\Pricing\Http\Controllers\TaxZoneController;
use Illuminate\Support\Facades\Route;

// `->middleware('api')` is required here for the same reason documented in
// every prior module's routes.php: this module registers routes from its
// own service provider, not bootstrap/app.php's `withRouting(api: ...)`.
Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    Route::get('pricing/lookup', PriceLookupController::class)
        ->middleware('permission:pricing.price_lists.view')->name('v1.pricing.lookup');

    Route::post('tax/calculate', TaxCalculationController::class)
        ->middleware('permission:pricing.tax.view')->name('v1.tax.calculate');

    Route::get('pricing/audit-logs', [AuditLogController::class, 'index'])
        ->middleware('permission:pricing.audit_log.view')->name('v1.pricing.audit-logs.index');

    Route::get('price-lists', [PriceListController::class, 'index'])
        ->middleware('permission:pricing.price_lists.view')->name('v1.price-lists.index');
    Route::post('price-lists', [PriceListController::class, 'store'])
        ->middleware('permission:pricing.price_lists.manage')->name('v1.price-lists.store');
    Route::get('price-lists/{priceList}', [PriceListController::class, 'show'])
        ->middleware('permission:pricing.price_lists.view')->name('v1.price-lists.show');
    Route::patch('price-lists/{priceList}', [PriceListController::class, 'update'])
        ->middleware('permission:pricing.price_lists.manage')->name('v1.price-lists.update');
    Route::post('price-lists/{priceList}/archive', [PriceListController::class, 'archive'])
        ->middleware('permission:pricing.price_lists.manage')->name('v1.price-lists.archive');
    Route::delete('price-lists/{priceList}', [PriceListController::class, 'destroy'])
        ->middleware('permission:pricing.price_lists.manage')->name('v1.price-lists.destroy');

    Route::post('price-lists/{priceList}/entries', [PriceListEntryController::class, 'store'])
        ->middleware('permission:pricing.price_lists.manage')->name('v1.price-lists.entries.store');
    Route::patch('price-lists/{priceList}/entries/{entry}', [PriceListEntryController::class, 'update'])
        ->middleware('permission:pricing.price_lists.manage')->name('v1.price-lists.entries.update');
    Route::delete('price-lists/{priceList}/entries/{entry}', [PriceListEntryController::class, 'destroy'])
        ->middleware('permission:pricing.price_lists.manage')->name('v1.price-lists.entries.destroy');

    Route::get('tax-zones', [TaxZoneController::class, 'index'])
        ->middleware('permission:pricing.tax.view')->name('v1.tax-zones.index');
    Route::post('tax-zones', [TaxZoneController::class, 'store'])
        ->middleware('permission:pricing.tax.manage')->name('v1.tax-zones.store');
    Route::get('tax-zones/{taxZone}', [TaxZoneController::class, 'show'])
        ->middleware('permission:pricing.tax.view')->name('v1.tax-zones.show');
    Route::patch('tax-zones/{taxZone}', [TaxZoneController::class, 'update'])
        ->middleware('permission:pricing.tax.manage')->name('v1.tax-zones.update');
    Route::post('tax-zones/{taxZone}/archive', [TaxZoneController::class, 'archive'])
        ->middleware('permission:pricing.tax.manage')->name('v1.tax-zones.archive');
    Route::delete('tax-zones/{taxZone}', [TaxZoneController::class, 'destroy'])
        ->middleware('permission:pricing.tax.manage')->name('v1.tax-zones.destroy');

    Route::get('tax-classes', [TaxClassController::class, 'index'])
        ->middleware('permission:pricing.tax.view')->name('v1.tax-classes.index');
    Route::post('tax-classes', [TaxClassController::class, 'store'])
        ->middleware('permission:pricing.tax.manage')->name('v1.tax-classes.store');
    Route::get('tax-classes/{taxClass}', [TaxClassController::class, 'show'])
        ->middleware('permission:pricing.tax.view')->name('v1.tax-classes.show');
    Route::patch('tax-classes/{taxClass}', [TaxClassController::class, 'update'])
        ->middleware('permission:pricing.tax.manage')->name('v1.tax-classes.update');
    Route::post('tax-classes/{taxClass}/archive', [TaxClassController::class, 'archive'])
        ->middleware('permission:pricing.tax.manage')->name('v1.tax-classes.archive');
    Route::delete('tax-classes/{taxClass}', [TaxClassController::class, 'destroy'])
        ->middleware('permission:pricing.tax.manage')->name('v1.tax-classes.destroy');

    Route::get('tax-rates', [TaxRateController::class, 'index'])
        ->middleware('permission:pricing.tax.view')->name('v1.tax-rates.index');
    Route::post('tax-rates', [TaxRateController::class, 'store'])
        ->middleware('permission:pricing.tax.manage')->name('v1.tax-rates.store');
    Route::get('tax-rates/{taxRate}', [TaxRateController::class, 'show'])
        ->middleware('permission:pricing.tax.view')->name('v1.tax-rates.show');
    Route::patch('tax-rates/{taxRate}', [TaxRateController::class, 'update'])
        ->middleware('permission:pricing.tax.manage')->name('v1.tax-rates.update');
    Route::post('tax-rates/{taxRate}/archive', [TaxRateController::class, 'archive'])
        ->middleware('permission:pricing.tax.manage')->name('v1.tax-rates.archive');
    Route::delete('tax-rates/{taxRate}', [TaxRateController::class, 'destroy'])
        ->middleware('permission:pricing.tax.manage')->name('v1.tax-rates.destroy');
});
