<?php

declare(strict_types=1);

/**
 * Reviews' API surface, required from Providers\ReviewsServiceProvider
 * ::boot(). Versioned under /api/v1 per API:VERSIONING.
 *
 * `GET /reviews` and `GET /reviews/summary` are the one real dual-audience
 * surface in this module — gated by `reviews.reviews.view` behind the same
 * `auth:sanctum` every route here requires, exactly like Catalog's own
 * `products.view` route: the Gateway's fixed `storefront-service`
 * credential is a real Sanctum token holding that permission, not an
 * unauthenticated public path (see ReviewsPermissionSeeder's own docblock
 * for how that credential is granted it).
 *
 * `POST /reviews` is `customer.guard` instead of any `permission:`, since a
 * customer holds no staff permissions at all — mirrors Customers' own
 * `customers/me` / Orders' own `orders/mine` routes exactly.
 *
 * `reviews/summary` and `reviews/audit-logs` are declared before the
 * resourceful `reviews/{review}` group for the identical route-matching
 * reason every prior module's own routes.php already documents.
 */

use App\Domains\Commerce\Reviews\Http\Controllers\AuditLogController;
use App\Domains\Commerce\Reviews\Http\Controllers\ReviewController;
use App\Domains\Commerce\Reviews\Http\Controllers\ReviewSummaryController;
use App\Domains\Commerce\Reviews\Http\Controllers\ReviewWorkflowController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    Route::get('reviews/summary', [ReviewSummaryController::class, 'show'])
        ->middleware('permission:reviews.reviews.view')->name('v1.reviews.summary');

    Route::get('reviews/audit-logs', [AuditLogController::class, 'index'])
        ->middleware('permission:reviews.audit_log.view')->name('v1.reviews.audit-logs.index');

    Route::get('reviews', [ReviewController::class, 'index'])
        ->middleware('permission:reviews.reviews.view')->name('v1.reviews.index');
    Route::get('reviews/{review}', [ReviewController::class, 'show'])
        ->middleware('permission:reviews.reviews.view')->name('v1.reviews.show');
    Route::delete('reviews/{review}', [ReviewController::class, 'destroy'])
        ->middleware('permission:reviews.reviews.manage')->name('v1.reviews.destroy');

    Route::post('reviews', [ReviewController::class, 'store'])
        ->middleware('customer.guard')->name('v1.reviews.store');

    Route::post('reviews/{review}/approve', [ReviewWorkflowController::class, 'approve'])
        ->middleware('permission:reviews.reviews.moderate')->name('v1.reviews.approve');
    Route::post('reviews/{review}/reject', [ReviewWorkflowController::class, 'reject'])
        ->middleware('permission:reviews.reviews.moderate')->name('v1.reviews.reject');
    Route::post('reviews/{review}/respond', [ReviewWorkflowController::class, 'respond'])
        ->middleware('permission:reviews.reviews.manage')->name('v1.reviews.respond');
});
