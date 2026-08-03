<?php

declare(strict_types=1);

/**
 * Customers' API surface, required from CustomersServiceProvider::boot()
 * and kept physically alongside the module that owns it, matching the
 * pattern every prior module already established.
 *
 * Versioned under /api/v1 per API:VERSIONING. Every route requires
 * `auth:sanctum` plus the specific `permission:` its operation corresponds
 * to (SECURITY:ROLES_PERMISSIONS), reusing Identity & Access's public
 * `permission:` middleware exactly as every prior module does — Customers
 * introduces no authorization mechanism of its own, and no self-service
 * (customer-authenticated) route exists yet, per Actions\
 * RegisterCustomerAction's docblock.
 *
 * `customers/audit-logs` is declared before `customers/{customer}` so
 * Laravel's order-sensitive route matching never tries to resolve
 * "audit-logs" as a {customer} UUID.
 */

use App\Domains\Commerce\Customers\Http\Controllers\AuditLogController;
use App\Domains\Commerce\Customers\Http\Controllers\CustomerAddressController;
use App\Domains\Commerce\Customers\Http\Controllers\CustomerController;
use Illuminate\Support\Facades\Route;

// `->middleware('api')` is required here for the same reason documented in
// every prior module's routes.php: this module registers routes from its
// own service provider, not bootstrap/app.php's `withRouting(api: ...)`.
Route::prefix('api/v1')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    Route::get('customers/audit-logs', [AuditLogController::class, 'index'])
        ->middleware('permission:customers.audit_log.view')->name('v1.customers.audit-logs.index');

    Route::get('customers', [CustomerController::class, 'index'])
        ->middleware('permission:customers.customers.view')->name('v1.customers.index');
    Route::post('customers', [CustomerController::class, 'store'])
        ->middleware('permission:customers.customers.manage')->name('v1.customers.store');
    Route::get('customers/{customer}', [CustomerController::class, 'show'])
        ->middleware('permission:customers.customers.view')->name('v1.customers.show');
    Route::patch('customers/{customer}', [CustomerController::class, 'update'])
        ->middleware('permission:customers.customers.manage')->name('v1.customers.update');
    Route::post('customers/{customer}/archive', [CustomerController::class, 'archive'])
        ->middleware('permission:customers.customers.manage')->name('v1.customers.archive');
    Route::delete('customers/{customer}', [CustomerController::class, 'destroy'])
        ->middleware('permission:customers.customers.manage')->name('v1.customers.destroy');
    Route::get('customers/{customer}/export', [CustomerController::class, 'export'])
        ->middleware('permission:customers.customers.view')->name('v1.customers.export');

    Route::post('customers/{customer}/addresses', [CustomerAddressController::class, 'store'])
        ->middleware('permission:customers.customers.manage')->name('v1.customers.addresses.store');
    Route::patch('customers/{customer}/addresses/{address}', [CustomerAddressController::class, 'update'])
        ->middleware('permission:customers.customers.manage')->name('v1.customers.addresses.update');
    Route::delete('customers/{customer}/addresses/{address}', [CustomerAddressController::class, 'destroy'])
        ->middleware('permission:customers.customers.manage')->name('v1.customers.addresses.destroy');
});
