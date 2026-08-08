<?php

declare(strict_types=1);

/**
 * Search's API surface, required from Providers\SearchServiceProvider::
 * boot(). Versioned under /api/v1 per API:VERSIONING. Every route
 * requires `auth:sanctum` plus its specific `permission:`.
 */

use App\Domains\Commerce\Search\Http\Controllers\AuditLogController;
use App\Domains\Commerce\Search\Http\Controllers\SearchController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    // "Global Search" and "Product Search" are the same endpoint in this
    // delivery's accepted scope — see Http\Controllers\SearchController's
    // own docblock.
    Route::get('search/products', [SearchController::class, 'products'])
        ->middleware('permission:search.products.view')->name('v1.search.products');

    Route::post('search/reindex', [SearchController::class, 'reindex'])
        ->middleware('permission:search.index.manage')->name('v1.search.reindex');

    Route::get('search-audit-logs', [AuditLogController::class, 'index'])
        ->middleware('permission:search.audit_log.view')->name('v1.search.audit-logs.index');
});
