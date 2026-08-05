<?php

declare(strict_types=1);

/**
 * Fulfillment's API surface, required from Providers\
 * FulfillmentServiceProvider::boot(), kept physically alongside the module
 * that owns it, matching the pattern every prior module already
 * established.
 *
 * Versioned under /api/v1 per API:VERSIONING. Every route requires
 * `auth:sanctum` plus the specific `permission:` its operation corresponds
 * to (SECURITY:ROLES_PERMISSIONS), reusing Identity & Access's public
 * `permission:` middleware exactly as every prior module does.
 */

use App\Domains\Operations\Fulfillment\Http\Controllers\AuditLogController;
use App\Domains\Operations\Fulfillment\Http\Controllers\ShipmentController;
use App\Domains\Operations\Fulfillment\Http\Controllers\ShipmentItemController;
use App\Domains\Operations\Fulfillment\Http\Controllers\ShipmentNoteController;
use App\Domains\Operations\Fulfillment\Http\Controllers\ShipmentWorkflowController;
use Illuminate\Support\Facades\Route;

// `->middleware('api')` is required here for the same reason documented in
// every prior module's routes.php: this module registers routes from its
// own service provider, not bootstrap/app.php's `withRouting(api: ...)`.
Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    Route::get('fulfillment/audit-logs', [AuditLogController::class, 'index'])
        ->middleware('permission:fulfillment.audit_log.view')->name('v1.fulfillment.audit-logs.index');

    Route::get('shipments', [ShipmentController::class, 'index'])
        ->middleware('permission:fulfillment.shipments.view')->name('v1.shipments.index');
    Route::post('shipments', [ShipmentController::class, 'store'])
        ->middleware('permission:fulfillment.shipments.manage')->name('v1.shipments.store');
    Route::get('shipments/{shipment}', [ShipmentController::class, 'show'])
        ->middleware('permission:fulfillment.shipments.view')->name('v1.shipments.show');

    Route::post('shipments/{shipment}/items', [ShipmentItemController::class, 'store'])
        ->middleware('permission:fulfillment.shipments.manage')->name('v1.shipments.items.store');
    Route::delete('shipments/{shipment}/items/{item}', [ShipmentItemController::class, 'destroy'])
        ->middleware('permission:fulfillment.shipments.manage')->name('v1.shipments.items.destroy');

    Route::post('shipments/{shipment}/notes', [ShipmentNoteController::class, 'store'])
        ->middleware('permission:fulfillment.shipments.manage')->name('v1.shipments.notes.store');

    Route::patch('shipments/{shipment}/destination', [ShipmentWorkflowController::class, 'setDestination'])
        ->middleware('permission:fulfillment.shipments.manage')->name('v1.shipments.destination.update');

    Route::post('shipments/{shipment}/pick/start', [ShipmentWorkflowController::class, 'startPicking'])
        ->middleware('permission:fulfillment.shipments.pick')->name('v1.shipments.pick.start');
    Route::post('shipments/{shipment}/pick/complete', [ShipmentWorkflowController::class, 'markPicked'])
        ->middleware('permission:fulfillment.shipments.pick')->name('v1.shipments.pick.complete');

    Route::post('shipments/{shipment}/pack/start', [ShipmentWorkflowController::class, 'startPacking'])
        ->middleware('permission:fulfillment.shipments.pack')->name('v1.shipments.pack.start');
    Route::post('shipments/{shipment}/pack/complete', [ShipmentWorkflowController::class, 'markPacked'])
        ->middleware('permission:fulfillment.shipments.pack')->name('v1.shipments.pack.complete');

    Route::post('shipments/{shipment}/dispatch', [ShipmentWorkflowController::class, 'dispatch'])
        ->middleware('permission:fulfillment.shipments.dispatch')->name('v1.shipments.dispatch');
    Route::post('shipments/{shipment}/in-transit', [ShipmentWorkflowController::class, 'markInTransit'])
        ->middleware('permission:fulfillment.shipments.dispatch')->name('v1.shipments.in-transit');
    Route::post('shipments/{shipment}/deliver', [ShipmentWorkflowController::class, 'markDelivered'])
        ->middleware('permission:fulfillment.shipments.dispatch')->name('v1.shipments.deliver');

    Route::post('shipments/{shipment}/fail', [ShipmentWorkflowController::class, 'markFailed'])
        ->middleware('permission:fulfillment.shipments.cancel')->name('v1.shipments.fail');
    Route::post('shipments/{shipment}/cancel', [ShipmentWorkflowController::class, 'cancel'])
        ->middleware('permission:fulfillment.shipments.cancel')->name('v1.shipments.cancel');
});
