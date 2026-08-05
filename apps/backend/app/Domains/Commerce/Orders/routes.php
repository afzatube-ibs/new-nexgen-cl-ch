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
 * every prior module's own routes.php already documents.
 */

use App\Domains\Commerce\Orders\Http\Controllers\AuditLogController;
use App\Domains\Commerce\Orders\Http\Controllers\OrderController;
use App\Domains\Commerce\Orders\Http\Controllers\OrderNoteController;
use App\Domains\Commerce\Orders\Http\Controllers\OrderStatusController;
use Illuminate\Support\Facades\Route;

// `->middleware('api')` is required here for the same reason documented in
// every prior module's routes.php: this module registers routes from its
// own service provider, not bootstrap/app.php's `withRouting(api: ...)`.
Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    Route::get('orders/audit-logs', [AuditLogController::class, 'index'])
        ->middleware('permission:orders.audit_log.view')->name('v1.orders.audit-logs.index');

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
