<?php

declare(strict_types=1);

/**
 * Orders' API surface, required from OrdersServiceProvider::boot() and
 * kept physically alongside the module that owns it, matching the
 * pattern every prior module already established.
 *
 * Versioned under /api/v1 per API:VERSIONING. Every route requires
 * `auth:sanctum` plus the specific `permission:` its operation corresponds
 * to (SECURITY:ROLES_PERMISSIONS), reusing Identity & Access's public
 * `permission:` middleware exactly as every prior module does.
 *
 * `orders/audit-logs` is registered before the resourceful
 * `orders/{order}` group for the same readability/route-matching reason
 * every prior module's own routes.php already documents. Production
 * Completion Plan v2, Milestone 5 (Customer Accounts): `orders/mine` and
 * `orders/mine/{order}` are declared before `orders/{order}` for the
 * identical reason — both are real, customer-guarded (`customer.guard`,
 * never `permission:`, since a customer holds no staff permissions) self-
 * service routes handled by CustomerOrderController, not OrderController.
 */

use App\Domains\Commerce\Orders\Http\Controllers\AuditLogController;
use App\Domains\Commerce\Orders\Http\Controllers\CustomerOrderController;
use App\Domains\Commerce\Orders\Http\Controllers\OrderController;
use App\Domains\Commerce\Orders\Http\Controllers\OrderMetricsController;
use App\Domains\Commerce\Orders\Http\Controllers\OrderNoteController;
use App\Domains\Commerce\Orders\Http\Controllers\OrderStatusController;
use Illuminate\Support\Facades\Route;

// `->middleware('api')` is required here for the same reason documented in
// every prior module's routes.php: this module registers routes from its
// own service provider, not bootstrap/app.php's `withRouting(api: ...)`.
Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    Route::middleware('customer.guard')->group(function (): void {
        Route::get('orders/mine', [CustomerOrderController::class, 'index'])->name('v1.orders.mine.index');
        Route::get('orders/mine/{order}', [CustomerOrderController::class, 'show'])->name('v1.orders.mine.show');
    });

    Route::get('orders/audit-logs', [AuditLogController::class, 'index'])
        ->middleware('permission:orders.audit_log.view')->name('v1.orders.audit-logs.index');

    // Production Completion Plan v2, Milestone 8 (Dashboard Real Widgets) —
    // registered before the resourceful `orders/{order}` group below for
    // the identical route-matching reason `orders/audit-logs` already is.
    Route::get('orders/metrics', [OrderMetricsController::class, 'summary'])
        ->middleware('permission:orders.orders.view')->name('v1.orders.metrics');
    Route::get('orders/top-products', [OrderMetricsController::class, 'topProducts'])
        ->middleware('permission:orders.orders.view')->name('v1.orders.top-products');

    Route::get('orders', [OrderController::class, 'index'])
        ->middleware('permission:orders.orders.view')->name('v1.orders.index');
    Route::post('orders', [OrderController::class, 'store'])
        ->middleware('permission:orders.orders.manage')->name('v1.orders.store');
    Route::get('orders/{order}', [OrderController::class, 'show'])
        ->middleware('permission:orders.orders.view')->name('v1.orders.show');

    Route::post('orders/{order}/confirm', [OrderStatusController::class, 'confirm'])
        ->middleware('permission:orders.orders.manage')->name('v1.orders.confirm');
    Route::post('orders/{order}/start-processing', [OrderStatusController::class, 'startProcessing'])
        ->middleware('permission:orders.orders.manage')->name('v1.orders.start-processing');
    Route::post('orders/{order}/ship', [OrderStatusController::class, 'ship'])
        ->middleware('permission:orders.orders.manage')->name('v1.orders.ship');
    Route::post('orders/{order}/deliver', [OrderStatusController::class, 'deliver'])
        ->middleware('permission:orders.orders.manage')->name('v1.orders.deliver');
    Route::post('orders/{order}/cancel', [OrderStatusController::class, 'cancel'])
        ->middleware('permission:orders.orders.manage')->name('v1.orders.cancel');

    Route::post('orders/{order}/notes', [OrderNoteController::class, 'store'])
        ->middleware('permission:orders.notes.manage')->name('v1.orders.notes.store');
});
