<?php

declare(strict_types=1);

/**
 * Checkout's API surface, required from CheckoutServiceProvider::boot()
 * and kept physically alongside the module that owns it, matching the
 * pattern every prior module already established.
 *
 * Versioned under /api/v1 per API:VERSIONING. Every route requires
 * `auth:sanctum` plus the specific `permission:` its operation
 * corresponds to (SECURITY:ROLES_PERMISSIONS) — see Authorization\
 * PermissionRegistry's docblock for why this stays staff-gated for now.
 *
 * `checkout/audit-logs` and `checkout/shipping-options` are registered
 * before the resourceful `checkout/sessions/{session}` group for the
 * same readability/route-matching reason every prior module's own
 * routes.php already documents.
 */

use App\Domains\Commerce\Checkout\Http\Controllers\AuditLogController;
use App\Domains\Commerce\Checkout\Http\Controllers\CheckoutAddressController;
use App\Domains\Commerce\Checkout\Http\Controllers\CheckoutCouponController;
use App\Domains\Commerce\Checkout\Http\Controllers\CheckoutItemController;
use App\Domains\Commerce\Checkout\Http\Controllers\CheckoutRecoveryController;
use App\Domains\Commerce\Checkout\Http\Controllers\CheckoutReviewController;
use App\Domains\Commerce\Checkout\Http\Controllers\CheckoutSessionController;
use App\Domains\Commerce\Checkout\Http\Controllers\CheckoutSubmissionController;
use App\Domains\Commerce\Checkout\Http\Controllers\ShippingOptionController;
use Illuminate\Support\Facades\Route;

// `->middleware('api')` is required here for the same reason documented in
// every prior module's routes.php: this module registers routes from its
// own service provider, not bootstrap/app.php's `withRouting(api: ...)`.
Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    Route::get('checkout/audit-logs', [AuditLogController::class, 'index'])
        ->middleware('permission:checkout.audit_log.view')->name('v1.checkout.audit-logs.index');

    Route::get('checkout/shipping-options', [ShippingOptionController::class, 'index'])
        ->middleware('permission:checkout.sessions.view')->name('v1.checkout.shipping-options.index');

    Route::post('checkout/sessions', [CheckoutSessionController::class, 'store'])
        ->middleware('permission:checkout.sessions.manage')->name('v1.checkout.sessions.store');
    Route::get('checkout/sessions/{session}', [CheckoutSessionController::class, 'show'])
        ->middleware('permission:checkout.sessions.view')->name('v1.checkout.sessions.show');

    Route::post('checkout/sessions/{session}/items', [CheckoutItemController::class, 'store'])
        ->middleware('permission:checkout.sessions.manage')->name('v1.checkout.items.store');
    Route::patch('checkout/sessions/{session}/items/{item}', [CheckoutItemController::class, 'update'])
        ->middleware('permission:checkout.sessions.manage')->name('v1.checkout.items.update');
    Route::delete('checkout/sessions/{session}/items/{item}', [CheckoutItemController::class, 'destroy'])
        ->middleware('permission:checkout.sessions.manage')->name('v1.checkout.items.destroy');

    Route::put('checkout/sessions/{session}/billing-address', [CheckoutAddressController::class, 'updateBilling'])
        ->middleware('permission:checkout.sessions.manage')->name('v1.checkout.billing-address.update');
    Route::put('checkout/sessions/{session}/shipping-address', [CheckoutAddressController::class, 'updateShipping'])
        ->middleware('permission:checkout.sessions.manage')->name('v1.checkout.shipping-address.update');

    Route::put('checkout/sessions/{session}/shipping-option', [ShippingOptionController::class, 'update'])
        ->middleware('permission:checkout.sessions.manage')->name('v1.checkout.shipping-option.update');

    Route::post('checkout/sessions/{session}/coupon', [CheckoutCouponController::class, 'store'])
        ->middleware('permission:checkout.sessions.manage')->name('v1.checkout.coupon.store');
    Route::delete('checkout/sessions/{session}/coupon', [CheckoutCouponController::class, 'destroy'])
        ->middleware('permission:checkout.sessions.manage')->name('v1.checkout.coupon.destroy');

    Route::post('checkout/sessions/{session}/review', CheckoutReviewController::class)
        ->middleware('permission:checkout.sessions.manage')->name('v1.checkout.review');
    Route::post('checkout/sessions/{session}/submit', CheckoutSubmissionController::class)
        ->middleware('permission:checkout.sessions.manage')->name('v1.checkout.submit');
    Route::post('checkout/sessions/{session}/recover', CheckoutRecoveryController::class)
        ->middleware('permission:checkout.sessions.manage')->name('v1.checkout.recover');
});
