<?php

declare(strict_types=1);

use App\Domains\Platform\Cms\Http\Controllers\CmsPageController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    Route::get('stores/{store}/cms/published/{slug}', [CmsPageController::class, 'published'])
        ->middleware('permission:cms.published.view')->name('v1.cms.published.show');

    Route::get('stores/{store}/cms/pages', [CmsPageController::class, 'index'])
        ->middleware('permission:cms.pages.view')->name('v1.cms.pages.index');
    Route::post('stores/{store}/cms/pages', [CmsPageController::class, 'store'])
        ->middleware('permission:cms.pages.manage')->name('v1.cms.pages.store');
    Route::get('stores/{store}/cms/pages/{page}', [CmsPageController::class, 'show'])
        ->middleware('permission:cms.pages.view')->name('v1.cms.pages.show');
    Route::patch('stores/{store}/cms/pages/{page}', [CmsPageController::class, 'update'])
        ->middleware('permission:cms.pages.manage')->name('v1.cms.pages.update');
    Route::delete('stores/{store}/cms/pages/{page}', [CmsPageController::class, 'destroy'])
        ->middleware('permission:cms.pages.manage')->name('v1.cms.pages.destroy');
    Route::post('stores/{store}/cms/pages/{page}/publish', [CmsPageController::class, 'publish'])
        ->middleware('permission:cms.pages.publish')->name('v1.cms.pages.publish');
    Route::post('stores/{store}/cms/pages/{page}/unpublish', [CmsPageController::class, 'unpublish'])
        ->middleware('permission:cms.pages.publish')->name('v1.cms.pages.unpublish');
    Route::get('stores/{store}/cms/pages/{page}/revisions', [CmsPageController::class, 'revisions'])
        ->middleware('permission:cms.pages.view')->name('v1.cms.pages.revisions');
    Route::post('stores/{store}/cms/pages/{page}/revisions/{revision}/restore', [CmsPageController::class, 'restore'])
        ->middleware('permission:cms.pages.manage')->name('v1.cms.pages.revisions.restore');
});
