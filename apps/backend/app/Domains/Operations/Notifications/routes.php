<?php

declare(strict_types=1);

/**
 * Notifications' API surface, required from Providers\
 * NotificationsServiceProvider::boot(). Versioned under /api/v1 per
 * API:VERSIONING. Every route requires `auth:sanctum` plus its specific
 * `permission:`.
 */

use App\Domains\Operations\Notifications\Http\Controllers\AuditLogController;
use App\Domains\Operations\Notifications\Http\Controllers\NotificationController;
use App\Domains\Operations\Notifications\Http\Controllers\NotificationProviderController;
use App\Domains\Operations\Notifications\Http\Controllers\NotificationTemplateController;
use App\Domains\Operations\Notifications\Http\Controllers\NotificationWorkflowController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    Route::get('notification-templates', [NotificationTemplateController::class, 'index'])
        ->middleware('permission:notifications.templates.view')->name('v1.notification-templates.index');
    Route::post('notification-templates', [NotificationTemplateController::class, 'store'])
        ->middleware('permission:notifications.templates.manage')->name('v1.notification-templates.store');
    Route::get('notification-templates/{notificationTemplate}', [NotificationTemplateController::class, 'show'])
        ->middleware('permission:notifications.templates.view')->name('v1.notification-templates.show');
    Route::patch('notification-templates/{notificationTemplate}', [NotificationTemplateController::class, 'update'])
        ->middleware('permission:notifications.templates.manage')->name('v1.notification-templates.update');

    Route::get('notifications', [NotificationController::class, 'index'])
        ->middleware('permission:notifications.notifications.view')->name('v1.notifications.index');
    Route::post('notifications', [NotificationController::class, 'store'])
        ->middleware('permission:notifications.notifications.manage')->name('v1.notifications.store');
    Route::get('notifications/{notification}', [NotificationController::class, 'show'])
        ->middleware('permission:notifications.notifications.view')->name('v1.notifications.show');
    Route::post('notifications/{notification}/retry', [NotificationWorkflowController::class, 'retry'])
        ->middleware('permission:notifications.notifications.manage')->name('v1.notifications.retry');
    Route::post('notifications/{notification}/cancel', [NotificationWorkflowController::class, 'cancel'])
        ->middleware('permission:notifications.notifications.manage')->name('v1.notifications.cancel');

    // A distinct path segment from `notifications/{notification}` above —
    // sharing the `notifications/` prefix would collide with that
    // route's {notification} binding (Laravel matches routes in
    // registration order), mirroring why Returns' own audit log route
    // lives under `returns/audit-logs`, a different segment from
    // `return-requests/{returnRequest}`.
    Route::get('notification-audit-logs', [AuditLogController::class, 'index'])
        ->middleware('permission:notifications.audit_log.view')->name('v1.notifications.audit-logs.index');

    // Production Completion Plan v2, Milestone 12 (Production Readiness
    // Indicators) — a distinct `notification-providers` segment for the
    // identical reason `notification-audit-logs` already is: sharing the
    // `notifications/` prefix would collide with `notifications/
    // {notification}`'s own wildcard binding.
    Route::get('notification-providers', [NotificationProviderController::class, 'index'])
        ->middleware('permission:notifications.providers.view')->name('v1.notifications.providers.index');
});
