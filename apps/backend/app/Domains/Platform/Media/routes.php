<?php

declare(strict_types=1);

/**
 * Media's API surface — versioned under /api/v1, `auth:sanctum` plus the
 * relevant `permission:` on every route, exactly matching every other
 * module's routes.php.
 */

use App\Domains\Platform\Media\Http\Controllers\AuditLogController;
use App\Domains\Platform\Media\Http\Controllers\MediaController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    Route::get('media', [MediaController::class, 'index'])->middleware('permission:media.assets.view')->name('v1.media.index');
    Route::post('media', [MediaController::class, 'store'])->middleware('permission:media.assets.manage')->name('v1.media.store');
    Route::get('media/{media}', [MediaController::class, 'show'])->middleware('permission:media.assets.view')->name('v1.media.show');
    Route::patch('media/{media}', [MediaController::class, 'update'])->middleware('permission:media.assets.manage')->name('v1.media.update');
    Route::delete('media/{media}', [MediaController::class, 'destroy'])->middleware('permission:media.assets.manage')->name('v1.media.destroy');
    Route::post('media/{id}/restore', [MediaController::class, 'restore'])->middleware('permission:media.assets.manage')->name('v1.media.restore');

    Route::get('media-library/audit-logs', [AuditLogController::class, 'index'])->middleware('permission:media.audit_log.view')->name('v1.media.audit-logs.index');
});
