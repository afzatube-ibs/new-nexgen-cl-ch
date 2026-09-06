<?php

declare(strict_types=1);

use App\Domains\Platform\Cms\Http\Controllers\CmsMenuController;
use App\Domains\Platform\Cms\Http\Controllers\CmsPageController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    Route::get('stores/{store}/cms/published', [CmsPageController::class, 'publishedIndex'])
        ->middleware('permission:cms.published.view')->name('v1.cms.published.index');
    Route::get('stores/{store}/cms/published/{slug}', [CmsPageController::class, 'published'])
        ->middleware('permission:cms.published.view')->name('v1.cms.published.show');
    Route::get('stores/{store}/cms/published-menus/{handle}', [CmsMenuController::class, 'published'])
        ->middleware('permission:cms.published.view')->name('v1.cms.published-menus.show');

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

    Route::get('stores/{store}/cms/menus', [CmsMenuController::class, 'index'])
        ->middleware('permission:cms.menus.view')->name('v1.cms.menus.index');
    Route::post('stores/{store}/cms/menus', [CmsMenuController::class, 'store'])
        ->middleware('permission:cms.menus.manage')->name('v1.cms.menus.store');
    Route::get('stores/{store}/cms/menus/{menu}', [CmsMenuController::class, 'show'])
        ->middleware('permission:cms.menus.view')->name('v1.cms.menus.show');
    Route::patch('stores/{store}/cms/menus/{menu}', [CmsMenuController::class, 'update'])
        ->middleware('permission:cms.menus.manage')->name('v1.cms.menus.update');
    Route::delete('stores/{store}/cms/menus/{menu}', [CmsMenuController::class, 'destroy'])
        ->middleware('permission:cms.menus.manage')->name('v1.cms.menus.destroy');
    Route::post('stores/{store}/cms/menus/{menu}/publish', [CmsMenuController::class, 'publish'])
        ->middleware('permission:cms.menus.publish')->name('v1.cms.menus.publish');
    Route::post('stores/{store}/cms/menus/{menu}/unpublish', [CmsMenuController::class, 'unpublish'])
        ->middleware('permission:cms.menus.publish')->name('v1.cms.menus.unpublish');
});
