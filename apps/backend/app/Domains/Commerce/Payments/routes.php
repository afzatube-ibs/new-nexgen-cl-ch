<?php

declare(strict_types=1);

/**
 * Payments' API surface, required from Providers\PaymentsServiceProvider::
 * boot() and kept physically alongside the module that owns it, matching
 * the pattern every prior module already established.
 *
 * Two distinct trust boundaries, per SECURITY:SECURITY_BOUNDARIES:
 *
 *  - Every ordinary management endpoint (initiate, capture, cancel,
 *    void, bank-transfer verification, audit log, payment methods)
 *    requires `auth:sanctum` plus the specific `permission:` its
 *    operation corresponds to, exactly like every prior module.
 *  - The three gateway webhook endpoints are deliberately WITHOUT
 *    `auth:sanctum` or any `permission:` middleware — an external
 *    gateway's server cannot present a Sanctum token — mirroring
 *    Installer's own precedent for a necessarily-unauthenticated flow.
 *    `throttle:payments-webhooks` (registered in Providers\
 *    PaymentsServiceProvider) is the abuse guard in place of
 *    authentication; Actions\ProcessGatewayWebhookAction's own signature
 *    verification is the actual trust boundary here, per SECURITY:
 *    SECURITY_BOUNDARIES' external-integration treatment.
 */

use App\Domains\Commerce\Payments\Http\Controllers\AuditLogController;
use App\Domains\Commerce\Payments\Http\Controllers\BankTransferVerificationController;
use App\Domains\Commerce\Payments\Http\Controllers\PaymentActionController;
use App\Domains\Commerce\Payments\Http\Controllers\PaymentController;
use App\Domains\Commerce\Payments\Http\Controllers\PaymentMethodController;
use App\Domains\Commerce\Payments\Http\Controllers\Webhooks\BkashWebhookController;
use App\Domains\Commerce\Payments\Http\Controllers\Webhooks\NagadWebhookController;
use App\Domains\Commerce\Payments\Http\Controllers\Webhooks\SslcommerzWebhookController;
use Illuminate\Support\Facades\Route;

// `->middleware('api')` is required here for the same reason documented in
// every prior module's routes.php: this module registers routes from its
// own service provider, not bootstrap/app.php's `withRouting(api: ...)`.
Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    Route::get('payments/audit-logs', [AuditLogController::class, 'index'])
        ->middleware('permission:payments.audit_log.view')->name('v1.payments.audit-logs.index');

    Route::get('payments/methods', [PaymentMethodController::class, 'index'])
        ->middleware('permission:payments.payments.view')->name('v1.payments.methods.index');

    Route::get('payments', [PaymentController::class, 'index'])
        ->middleware('permission:payments.payments.view')->name('v1.payments.index');
    Route::post('payments', [PaymentController::class, 'store'])
        ->middleware('permission:payments.payments.manage')->name('v1.payments.store');
    Route::get('payments/{payment}', [PaymentController::class, 'show'])
        ->middleware('permission:payments.payments.view')->name('v1.payments.show');

    Route::post('payments/{payment}/capture', [PaymentActionController::class, 'capture'])
        ->middleware('permission:payments.payments.manage')->name('v1.payments.capture');
    Route::post('payments/{payment}/cancel', [PaymentActionController::class, 'cancel'])
        ->middleware('permission:payments.payments.manage')->name('v1.payments.cancel');
    Route::post('payments/{payment}/void', [PaymentActionController::class, 'void'])
        ->middleware('permission:payments.payments.manage')->name('v1.payments.void');

    Route::post('payments/{payment}/bank-transfer/proof', [BankTransferVerificationController::class, 'attachProof'])
        ->middleware('permission:payments.payments.manage')->name('v1.payments.bank-transfer.proof');
    Route::post('payments/{payment}/bank-transfer/approve', [BankTransferVerificationController::class, 'approve'])
        ->middleware('permission:payments.bank_transfer.verify')->name('v1.payments.bank-transfer.approve');
    Route::post('payments/{payment}/bank-transfer/reject', [BankTransferVerificationController::class, 'reject'])
        ->middleware('permission:payments.bank_transfer.verify')->name('v1.payments.bank-transfer.reject');
});

// `withoutMiddleware('throttle:api')`: see Identity & Access's identically-
// reasoned login route. `throttle:payments-webhooks` is already this
// route group's own purpose-built limiter (keyed by IP, since a gateway's
// server never authenticates) — stacking the platform-wide floor
// underneath it produces misleading `X-RateLimit-*` headers without
// adding real protection, found and verified live during Phase 1.1's
// hardening pass.
Route::prefix('api/v1')->middleware(['api', 'throttle:payments-webhooks'])->withoutMiddleware('throttle:api')->group(function (): void {
    Route::post('payments/webhooks/sslcommerz', SslcommerzWebhookController::class)->name('v1.payments.webhooks.sslcommerz');
    Route::post('payments/webhooks/bkash', BkashWebhookController::class)->name('v1.payments.webhooks.bkash');
    Route::post('payments/webhooks/nagad', NagadWebhookController::class)->name('v1.payments.webhooks.nagad');
});
