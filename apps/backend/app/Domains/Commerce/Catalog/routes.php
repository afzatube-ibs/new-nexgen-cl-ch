<?php

declare(strict_types=1);

/**
 * Catalog's API surface, required from CatalogServiceProvider::boot() and
 * kept physically alongside the module that owns it, matching the pattern
 * every prior Platform module already established.
 *
 * Versioned under /api/v1 per API:VERSIONING. Every route requires
 * `auth:sanctum` plus the specific `permission:` its operation
 * corresponds to (SECURITY:ROLES_PERMISSIONS), reusing Identity & Access's
 * public `permission:` middleware exactly as Store Configuration does —
 * Catalog introduces no authorization mechanism of its own.
 */

use App\Domains\Commerce\Catalog\Http\Controllers\AttributeController;
use App\Domains\Commerce\Catalog\Http\Controllers\AttributeGroupController;
use App\Domains\Commerce\Catalog\Http\Controllers\AuditLogController;
use App\Domains\Commerce\Catalog\Http\Controllers\BrandController;
use App\Domains\Commerce\Catalog\Http\Controllers\CategoryController;
use App\Domains\Commerce\Catalog\Http\Controllers\CollectionController;
use App\Domains\Commerce\Catalog\Http\Controllers\OptionController;
use App\Domains\Commerce\Catalog\Http\Controllers\OptionValueController;
use App\Domains\Commerce\Catalog\Http\Controllers\ProductAttributeValueController;
use App\Domains\Commerce\Catalog\Http\Controllers\ProductCategoryAssignmentController;
use App\Domains\Commerce\Catalog\Http\Controllers\ProductCollectionAssignmentController;
use App\Domains\Commerce\Catalog\Http\Controllers\ProductController;
use App\Domains\Commerce\Catalog\Http\Controllers\ProductImageController;
use App\Domains\Commerce\Catalog\Http\Controllers\ProductOptionAssignmentController;
use App\Domains\Commerce\Catalog\Http\Controllers\ProductRelationshipController;
use App\Domains\Commerce\Catalog\Http\Controllers\ProductTagAssignmentController;
use App\Domains\Commerce\Catalog\Http\Controllers\ProductVariantController;
use App\Domains\Commerce\Catalog\Http\Controllers\TagController;
use Illuminate\Support\Facades\Route;

// `->middleware('api')` is required here for the same reason documented in
// every prior module's routes.php: this module registers routes from its
// own service provider, not bootstrap/app.php's `withRouting(api: ...)`.
Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {

    // --- Brands ---
    Route::get('brands', [BrandController::class, 'index'])->middleware('permission:catalog.brands.view')->name('v1.brands.index');
    Route::post('brands', [BrandController::class, 'store'])->middleware('permission:catalog.brands.manage')->name('v1.brands.store');
    Route::get('brands/{brand}', [BrandController::class, 'show'])->middleware('permission:catalog.brands.view')->name('v1.brands.show');
    Route::patch('brands/{brand}', [BrandController::class, 'update'])->middleware('permission:catalog.brands.manage')->name('v1.brands.update');
    Route::post('brands/{brand}/archive', [BrandController::class, 'archive'])->middleware('permission:catalog.brands.manage')->name('v1.brands.archive');
    Route::delete('brands/{brand}', [BrandController::class, 'destroy'])->middleware('permission:catalog.brands.manage')->name('v1.brands.destroy');
    Route::post('brands/{brand}/restore', [BrandController::class, 'restore'])->middleware('permission:catalog.brands.manage')->name('v1.brands.restore');

    // --- Categories ---
    Route::get('categories', [CategoryController::class, 'index'])->middleware('permission:catalog.categories.view')->name('v1.categories.index');
    Route::post('categories', [CategoryController::class, 'store'])->middleware('permission:catalog.categories.manage')->name('v1.categories.store');
    Route::get('categories/{category}', [CategoryController::class, 'show'])->middleware('permission:catalog.categories.view')->name('v1.categories.show');
    Route::patch('categories/{category}', [CategoryController::class, 'update'])->middleware('permission:catalog.categories.manage')->name('v1.categories.update');
    Route::post('categories/{category}/archive', [CategoryController::class, 'archive'])->middleware('permission:catalog.categories.manage')->name('v1.categories.archive');
    Route::delete('categories/{category}', [CategoryController::class, 'destroy'])->middleware('permission:catalog.categories.manage')->name('v1.categories.destroy');
    Route::post('categories/{category}/restore', [CategoryController::class, 'restore'])->middleware('permission:catalog.categories.manage')->name('v1.categories.restore');

    // --- Attribute Groups & Attributes ---
    Route::get('attribute-groups', [AttributeGroupController::class, 'index'])->middleware('permission:catalog.attributes.view')->name('v1.attribute-groups.index');
    Route::post('attribute-groups', [AttributeGroupController::class, 'store'])->middleware('permission:catalog.attributes.manage')->name('v1.attribute-groups.store');
    Route::get('attribute-groups/{attributeGroup}', [AttributeGroupController::class, 'show'])->middleware('permission:catalog.attributes.view')->name('v1.attribute-groups.show');
    Route::patch('attribute-groups/{attributeGroup}', [AttributeGroupController::class, 'update'])->middleware('permission:catalog.attributes.manage')->name('v1.attribute-groups.update');
    Route::delete('attribute-groups/{attributeGroup}', [AttributeGroupController::class, 'destroy'])->middleware('permission:catalog.attributes.manage')->name('v1.attribute-groups.destroy');
    Route::post('attribute-groups/{attributeGroup}/restore', [AttributeGroupController::class, 'restore'])->middleware('permission:catalog.attributes.manage')->name('v1.attribute-groups.restore');

    Route::get('attributes', [AttributeController::class, 'index'])->middleware('permission:catalog.attributes.view')->name('v1.attributes.index');
    Route::post('attributes', [AttributeController::class, 'store'])->middleware('permission:catalog.attributes.manage')->name('v1.attributes.store');
    Route::get('attributes/{attribute}', [AttributeController::class, 'show'])->middleware('permission:catalog.attributes.view')->name('v1.attributes.show');
    Route::patch('attributes/{attribute}', [AttributeController::class, 'update'])->middleware('permission:catalog.attributes.manage')->name('v1.attributes.update');
    Route::delete('attributes/{attribute}', [AttributeController::class, 'destroy'])->middleware('permission:catalog.attributes.manage')->name('v1.attributes.destroy');
    Route::post('attributes/{attribute}/restore', [AttributeController::class, 'restore'])->middleware('permission:catalog.attributes.manage')->name('v1.attributes.restore');

    // --- Options & Option Values ---
    Route::get('options', [OptionController::class, 'index'])->middleware('permission:catalog.options.view')->name('v1.options.index');
    Route::post('options', [OptionController::class, 'store'])->middleware('permission:catalog.options.manage')->name('v1.options.store');
    Route::get('options/{option}', [OptionController::class, 'show'])->middleware('permission:catalog.options.view')->name('v1.options.show');
    Route::patch('options/{option}', [OptionController::class, 'update'])->middleware('permission:catalog.options.manage')->name('v1.options.update');
    Route::delete('options/{option}', [OptionController::class, 'destroy'])->middleware('permission:catalog.options.manage')->name('v1.options.destroy');
    Route::post('options/{option}/restore', [OptionController::class, 'restore'])->middleware('permission:catalog.options.manage')->name('v1.options.restore');

    Route::post('options/{option}/values', [OptionValueController::class, 'store'])->middleware('permission:catalog.options.manage')->name('v1.options.values.store');
    Route::patch('options/{option}/values/{value}', [OptionValueController::class, 'update'])->middleware('permission:catalog.options.manage')->name('v1.options.values.update');
    Route::delete('options/{option}/values/{value}', [OptionValueController::class, 'destroy'])->middleware('permission:catalog.options.manage')->name('v1.options.values.destroy');

    // --- Collections & Tags ---
    Route::get('collections', [CollectionController::class, 'index'])->middleware('permission:catalog.collections.view')->name('v1.collections.index');
    Route::post('collections', [CollectionController::class, 'store'])->middleware('permission:catalog.collections.manage')->name('v1.collections.store');
    Route::get('collections/{collection}', [CollectionController::class, 'show'])->middleware('permission:catalog.collections.view')->name('v1.collections.show');
    Route::patch('collections/{collection}', [CollectionController::class, 'update'])->middleware('permission:catalog.collections.manage')->name('v1.collections.update');
    Route::post('collections/{collection}/archive', [CollectionController::class, 'archive'])->middleware('permission:catalog.collections.manage')->name('v1.collections.archive');
    Route::delete('collections/{collection}', [CollectionController::class, 'destroy'])->middleware('permission:catalog.collections.manage')->name('v1.collections.destroy');
    Route::post('collections/{collection}/restore', [CollectionController::class, 'restore'])->middleware('permission:catalog.collections.manage')->name('v1.collections.restore');

    Route::get('tags', [TagController::class, 'index'])->middleware('permission:catalog.tags.view')->name('v1.tags.index');
    Route::post('tags', [TagController::class, 'store'])->middleware('permission:catalog.tags.manage')->name('v1.tags.store');
    Route::get('tags/{tag}', [TagController::class, 'show'])->middleware('permission:catalog.tags.view')->name('v1.tags.show');
    Route::patch('tags/{tag}', [TagController::class, 'update'])->middleware('permission:catalog.tags.manage')->name('v1.tags.update');
    Route::delete('tags/{tag}', [TagController::class, 'destroy'])->middleware('permission:catalog.tags.manage')->name('v1.tags.destroy');
    Route::post('tags/{tag}/restore', [TagController::class, 'restore'])->middleware('permission:catalog.tags.manage')->name('v1.tags.restore');

    // --- Products ---
    Route::get('products', [ProductController::class, 'index'])->middleware('permission:catalog.products.view')->name('v1.products.index');
    Route::post('products', [ProductController::class, 'store'])->middleware('permission:catalog.products.manage')->name('v1.products.store');
    Route::get('products/{product}', [ProductController::class, 'show'])->middleware('permission:catalog.products.view')->name('v1.products.show');
    Route::patch('products/{product}', [ProductController::class, 'update'])->middleware('permission:catalog.products.manage')->name('v1.products.update');
    Route::post('products/{product}/publish', [ProductController::class, 'publish'])->middleware('permission:catalog.products.manage')->name('v1.products.publish');
    Route::post('products/{product}/archive', [ProductController::class, 'archive'])->middleware('permission:catalog.products.manage')->name('v1.products.archive');
    Route::delete('products/{product}', [ProductController::class, 'destroy'])->middleware('permission:catalog.products.manage')->name('v1.products.destroy');
    Route::post('products/{product}/restore', [ProductController::class, 'restore'])->middleware('permission:catalog.products.manage')->name('v1.products.restore');

    Route::put('products/{product}/attribute-values', [ProductAttributeValueController::class, 'update'])->middleware('permission:catalog.products.manage')->name('v1.products.attribute-values.update');
    Route::put('products/{product}/categories', [ProductCategoryAssignmentController::class, 'update'])->middleware('permission:catalog.products.manage')->name('v1.products.categories.update');
    Route::put('products/{product}/collections', [ProductCollectionAssignmentController::class, 'update'])->middleware('permission:catalog.products.manage')->name('v1.products.collections.update');
    Route::put('products/{product}/tags', [ProductTagAssignmentController::class, 'update'])->middleware('permission:catalog.products.manage')->name('v1.products.tags.update');
    Route::put('products/{product}/options', [ProductOptionAssignmentController::class, 'update'])->middleware('permission:catalog.products.manage')->name('v1.products.options.update');

    Route::get('products/{product}/variants', [ProductVariantController::class, 'index'])->middleware('permission:catalog.products.view')->name('v1.products.variants.index');
    Route::post('products/{product}/variants', [ProductVariantController::class, 'store'])->middleware('permission:catalog.products.manage')->name('v1.products.variants.store');
    Route::patch('products/{product}/variants/{variant}', [ProductVariantController::class, 'update'])->middleware('permission:catalog.products.manage')->name('v1.products.variants.update');
    Route::post('products/{product}/variants/{variant}/archive', [ProductVariantController::class, 'archive'])->middleware('permission:catalog.products.manage')->name('v1.products.variants.archive');
    Route::delete('products/{product}/variants/{variant}', [ProductVariantController::class, 'destroy'])->middleware('permission:catalog.products.manage')->name('v1.products.variants.destroy');

    Route::get('products/{product}/images', [ProductImageController::class, 'index'])->middleware('permission:catalog.products.view')->name('v1.products.images.index');
    Route::post('products/{product}/images', [ProductImageController::class, 'store'])->middleware('permission:catalog.products.manage')->name('v1.products.images.store');
    Route::patch('products/{product}/images/{image}', [ProductImageController::class, 'update'])->middleware('permission:catalog.products.manage')->name('v1.products.images.update');
    Route::delete('products/{product}/images/{image}', [ProductImageController::class, 'destroy'])->middleware('permission:catalog.products.manage')->name('v1.products.images.destroy');

    Route::get('products/{product}/relationships', [ProductRelationshipController::class, 'index'])->middleware('permission:catalog.products.view')->name('v1.products.relationships.index');
    Route::post('products/{product}/relationships', [ProductRelationshipController::class, 'store'])->middleware('permission:catalog.products.manage')->name('v1.products.relationships.store');
    Route::delete('products/{product}/relationships/{relationship}', [ProductRelationshipController::class, 'destroy'])->middleware('permission:catalog.products.manage')->name('v1.products.relationships.destroy');

    // --- Audit Log ---
    Route::get('catalog/audit-logs', [AuditLogController::class, 'index'])->middleware('permission:catalog.audit_log.view')->name('v1.catalog.audit-logs.index');
});
