<?php

declare(strict_types=1);

/**
 * Promotions' API surface, required from PromotionsServiceProvider::boot()
 * and kept physically alongside the module that owns it, matching the
 * pattern every prior module already established.
 *
 * Versioned under /api/v1 per API:VERSIONING. Every route requires
 * `auth:sanctum` plus the specific `permission:` its operation corresponds
 * to (SECURITY:ROLES_PERMISSIONS), reusing Identity & Access's public
 * `permission:` middleware exactly as every prior module does.
 *
 * `promotions/evaluate`, `promotions/redeem`, `promotions/redemptions`,
 * and `promotions/audit-logs` are registered before the resourceful
 * `promotions/{promotion}` group for the same readability/route-matching
 * reason Customers' and Pricing's own routes.php already document — none
 * of them share a URI prefix with a {promotion} segment that could
 * otherwise swallow them.
 */

use App\Domains\Commerce\Promotions\Http\Controllers\AuditLogController;
use App\Domains\Commerce\Promotions\Http\Controllers\CouponController;
use App\Domains\Commerce\Promotions\Http\Controllers\PromotionConditionController;
use App\Domains\Commerce\Promotions\Http\Controllers\PromotionController;
use App\Domains\Commerce\Promotions\Http\Controllers\PromotionEvaluationController;
use App\Domains\Commerce\Promotions\Http\Controllers\PromotionRedemptionController;
use Illuminate\Support\Facades\Route;

// `->middleware('api')` is required here for the same reason documented in
// every prior module's routes.php: this module registers routes from its
// own service provider, not bootstrap/app.php's `withRouting(api: ...)`.
Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    Route::post('promotions/evaluate', PromotionEvaluationController::class)
        ->middleware('permission:promotions.promotions.view')->name('v1.promotions.evaluate');

    Route::get('promotions/redemptions', [PromotionRedemptionController::class, 'index'])
        ->middleware('permission:promotions.redemptions.view')->name('v1.promotions.redemptions.index');
    Route::post('promotions/redeem', [PromotionRedemptionController::class, 'store'])
        ->middleware('permission:promotions.promotions.manage')->name('v1.promotions.redeem');

    Route::get('promotions/audit-logs', [AuditLogController::class, 'index'])
        ->middleware('permission:promotions.audit_log.view')->name('v1.promotions.audit-logs.index');

    Route::get('promotions', [PromotionController::class, 'index'])
        ->middleware('permission:promotions.promotions.view')->name('v1.promotions.index');
    Route::post('promotions', [PromotionController::class, 'store'])
        ->middleware('permission:promotions.promotions.manage')->name('v1.promotions.store');
    Route::get('promotions/{promotion}', [PromotionController::class, 'show'])
        ->middleware('permission:promotions.promotions.view')->name('v1.promotions.show');
    Route::patch('promotions/{promotion}', [PromotionController::class, 'update'])
        ->middleware('permission:promotions.promotions.manage')->name('v1.promotions.update');
    Route::post('promotions/{promotion}/archive', [PromotionController::class, 'archive'])
        ->middleware('permission:promotions.promotions.manage')->name('v1.promotions.archive');
    Route::delete('promotions/{promotion}', [PromotionController::class, 'destroy'])
        ->middleware('permission:promotions.promotions.manage')->name('v1.promotions.destroy');

    Route::post('promotions/{promotion}/conditions', [PromotionConditionController::class, 'store'])
        ->middleware('permission:promotions.promotions.manage')->name('v1.promotions.conditions.store');
    Route::patch('promotions/{promotion}/conditions/{condition}', [PromotionConditionController::class, 'update'])
        ->middleware('permission:promotions.promotions.manage')->name('v1.promotions.conditions.update');
    Route::delete('promotions/{promotion}/conditions/{condition}', [PromotionConditionController::class, 'destroy'])
        ->middleware('permission:promotions.promotions.manage')->name('v1.promotions.conditions.destroy');

    Route::get('promotions/{promotion}/coupons', [CouponController::class, 'index'])
        ->middleware('permission:promotions.coupons.view')->name('v1.promotions.coupons.index');
    Route::post('promotions/{promotion}/coupons', [CouponController::class, 'store'])
        ->middleware('permission:promotions.coupons.manage')->name('v1.promotions.coupons.store');
    Route::get('promotions/{promotion}/coupons/{coupon}', [CouponController::class, 'show'])
        ->middleware('permission:promotions.coupons.view')->name('v1.promotions.coupons.show');
    Route::patch('promotions/{promotion}/coupons/{coupon}', [CouponController::class, 'update'])
        ->middleware('permission:promotions.coupons.manage')->name('v1.promotions.coupons.update');
    Route::post('promotions/{promotion}/coupons/{coupon}/archive', [CouponController::class, 'archive'])
        ->middleware('permission:promotions.coupons.manage')->name('v1.promotions.coupons.archive');
    Route::delete('promotions/{promotion}/coupons/{coupon}', [CouponController::class, 'destroy'])
        ->middleware('permission:promotions.coupons.manage')->name('v1.promotions.coupons.destroy');
});
