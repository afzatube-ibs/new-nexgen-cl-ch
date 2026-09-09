<?php

declare(strict_types=1);

/**
 * Inventory's API surface — versioned under /api/v1, `auth:sanctum` plus
 * the relevant `permission:` on every route, matching every other
 * module's routes.php.
 */

use App\Domains\Commerce\Inventory\Http\Controllers\AuditLogController;
use App\Domains\Commerce\Inventory\Http\Controllers\AvailabilityController;
use App\Domains\Commerce\Inventory\Http\Controllers\ReservationController;
use App\Domains\Commerce\Inventory\Http\Controllers\StockItemController;
use App\Domains\Commerce\Inventory\Http\Controllers\StockTransferController;
use App\Domains\Commerce\Inventory\Http\Controllers\WarehouseController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    // --- Warehouses ---
    Route::get('warehouses', [WarehouseController::class, 'index'])->middleware('permission:inventory.warehouses.view')->name('v1.warehouses.index');
    Route::post('warehouses', [WarehouseController::class, 'store'])->middleware('permission:inventory.warehouses.manage')->name('v1.warehouses.store');
    Route::get('warehouses/{warehouse}', [WarehouseController::class, 'show'])->middleware('permission:inventory.warehouses.view')->name('v1.warehouses.show');
    Route::patch('warehouses/{warehouse}', [WarehouseController::class, 'update'])->middleware('permission:inventory.warehouses.manage')->name('v1.warehouses.update');
    Route::post('warehouses/{warehouse}/archive', [WarehouseController::class, 'archive'])->middleware('permission:inventory.warehouses.manage')->name('v1.warehouses.archive');
    Route::delete('warehouses/{warehouse}', [WarehouseController::class, 'destroy'])->middleware('permission:inventory.warehouses.manage')->name('v1.warehouses.destroy');
    Route::post('warehouses/{warehouse}/restore', [WarehouseController::class, 'restore'])->middleware('permission:inventory.warehouses.manage')->name('v1.warehouses.restore');

    // --- Stock Items ---
    Route::get('stock-items', [StockItemController::class, 'index'])->middleware('permission:inventory.stock.view')->name('v1.stock-items.index');
    Route::post('stock-items/adjust', [StockItemController::class, 'adjust'])->middleware('permission:inventory.stock.manage')->name('v1.stock-items.adjust');
    Route::get('stock-items/{stockItem}', [StockItemController::class, 'show'])->middleware('permission:inventory.stock.view')->name('v1.stock-items.show');
    Route::get('stock-items/{stockItem}/adjustments', [StockItemController::class, 'adjustments'])->middleware('permission:inventory.stock.view')->name('v1.stock-items.adjustments.index');
    Route::post('stock-items/{stockItem}/reservations', [StockItemController::class, 'reserve'])->middleware('permission:inventory.reservations.manage')->name('v1.stock-items.reservations.store');
    Route::get('stock-items/{stockItem}/reservations', [StockItemController::class, 'reservations'])->middleware('permission:inventory.stock.view')->name('v1.stock-items.reservations.index');

    // --- Reservations ---
    Route::post('reservations/{reservation}/release', [ReservationController::class, 'release'])->middleware('permission:inventory.reservations.manage')->name('v1.reservations.release');
    Route::post('reservations/{reservation}/commit', [ReservationController::class, 'commit'])->middleware('permission:inventory.reservations.manage')->name('v1.reservations.commit');

    // --- Stock Transfers ---
    Route::get('stock-transfers', [StockTransferController::class, 'index'])->middleware('permission:inventory.stock.view')->name('v1.stock-transfers.index');
    Route::post('stock-transfers', [StockTransferController::class, 'store'])->middleware('permission:inventory.transfers.manage')->name('v1.stock-transfers.store');
    Route::get('stock-transfers/{stockTransfer}', [StockTransferController::class, 'show'])->middleware('permission:inventory.stock.view')->name('v1.stock-transfers.show');
    Route::post('stock-transfers/{stockTransfer}/complete', [StockTransferController::class, 'complete'])->middleware('permission:inventory.transfers.manage')->name('v1.stock-transfers.complete');
    Route::post('stock-transfers/{stockTransfer}/cancel', [StockTransferController::class, 'cancel'])->middleware('permission:inventory.transfers.manage')->name('v1.stock-transfers.cancel');

    // --- Availability ---
    Route::get('inventory/availability', [AvailabilityController::class, 'show'])->middleware('permission:inventory.stock.view')->name('v1.inventory.availability');
    Route::get('inventory/availability-many', [AvailabilityController::class, 'index'])->middleware('permission:inventory.availability.view')->name('v1.inventory.availability-many');

    // --- Audit Log ---
    Route::get('inventory/audit-logs', [AuditLogController::class, 'index'])->middleware('permission:inventory.audit_log.view')->name('v1.inventory.audit-logs.index');
});
