<?php

declare(strict_types=1);

/**
 * Returns' API surface, required from Providers\ReturnsServiceProvider
 * ::boot(). Versioned under /api/v1 per API:VERSIONING. Every route
 * requires `auth:sanctum` plus its specific `permission:`.
 */

use App\Domains\Operations\Returns\Http\Controllers\AuditLogController;
use App\Domains\Operations\Returns\Http\Controllers\ExchangeRequestController;
use App\Domains\Operations\Returns\Http\Controllers\RefundRequestController;
use App\Domains\Operations\Returns\Http\Controllers\ReturnNoteController;
use App\Domains\Operations\Returns\Http\Controllers\ReturnRequestController;
use App\Domains\Operations\Returns\Http\Controllers\ReturnRequestWorkflowController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    Route::get('returns/audit-logs', [AuditLogController::class, 'index'])
        ->middleware('permission:returns.audit_log.view')->name('v1.returns.audit-logs.index');

    Route::get('return-requests', [ReturnRequestController::class, 'index'])
        ->middleware('permission:returns.requests.view')->name('v1.return-requests.index');
    Route::post('return-requests', [ReturnRequestController::class, 'store'])
        ->middleware('permission:returns.requests.manage')->name('v1.return-requests.store');
    Route::get('return-requests/{returnRequest}', [ReturnRequestController::class, 'show'])
        ->middleware('permission:returns.requests.view')->name('v1.return-requests.show');

    Route::post('return-requests/{returnRequest}/notes', [ReturnNoteController::class, 'store'])
        ->middleware('permission:returns.requests.manage')->name('v1.return-requests.notes.store');

    Route::post('return-requests/{returnRequest}/approve', [ReturnRequestWorkflowController::class, 'approve'])
        ->middleware('permission:returns.requests.approve')->name('v1.return-requests.approve');
    Route::post('return-requests/{returnRequest}/reject', [ReturnRequestWorkflowController::class, 'reject'])
        ->middleware('permission:returns.requests.approve')->name('v1.return-requests.reject');
    Route::post('return-requests/{returnRequest}/cancel', [ReturnRequestWorkflowController::class, 'cancel'])
        ->middleware('permission:returns.requests.cancel')->name('v1.return-requests.cancel');
    Route::post('return-requests/{returnRequest}/pickup', [ReturnRequestWorkflowController::class, 'schedulePickup'])
        ->middleware('permission:returns.requests.manage')->name('v1.return-requests.pickup');
    Route::post('return-requests/{returnRequest}/receive', [ReturnRequestWorkflowController::class, 'markReceived'])
        ->middleware('permission:returns.requests.inspect')->name('v1.return-requests.receive');
    Route::post('return-requests/{returnRequest}/inspect', [ReturnRequestWorkflowController::class, 'startInspection'])
        ->middleware('permission:returns.requests.inspect')->name('v1.return-requests.inspect');
    Route::post('return-requests/{returnRequest}/resolve', [ReturnRequestWorkflowController::class, 'resolve'])
        ->middleware('permission:returns.requests.resolve')->name('v1.return-requests.resolve');

    Route::get('refund-requests', [RefundRequestController::class, 'index'])
        ->middleware('permission:returns.requests.view')->name('v1.refund-requests.index');
    Route::get('refund-requests/{refundRequest}', [RefundRequestController::class, 'show'])
        ->middleware('permission:returns.requests.view')->name('v1.refund-requests.show');
    Route::post('refund-requests/{refundRequest}/retry', [RefundRequestController::class, 'retry'])
        ->middleware('permission:returns.requests.resolve')->name('v1.refund-requests.retry');

    Route::get('exchange-requests', [ExchangeRequestController::class, 'index'])
        ->middleware('permission:returns.requests.view')->name('v1.exchange-requests.index');
    Route::get('exchange-requests/{exchangeRequest}', [ExchangeRequestController::class, 'show'])
        ->middleware('permission:returns.requests.view')->name('v1.exchange-requests.show');
    Route::post('exchange-requests/{exchangeRequest}/prepare', [ExchangeRequestController::class, 'startPreparing'])
        ->middleware('permission:returns.requests.manage')->name('v1.exchange-requests.prepare');
    Route::post('exchange-requests/{exchangeRequest}/ship', [ExchangeRequestController::class, 'markShipped'])
        ->middleware('permission:returns.requests.manage')->name('v1.exchange-requests.ship');
    Route::post('exchange-requests/{exchangeRequest}/complete', [ExchangeRequestController::class, 'complete'])
        ->middleware('permission:returns.requests.manage')->name('v1.exchange-requests.complete');
    Route::post('exchange-requests/{exchangeRequest}/cancel', [ExchangeRequestController::class, 'cancel'])
        ->middleware('permission:returns.requests.cancel')->name('v1.exchange-requests.cancel');
});
