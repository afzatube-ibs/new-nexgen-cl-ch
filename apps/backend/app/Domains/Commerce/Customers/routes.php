<?php

declare(strict_types=1);

/**
 * Customers' API surface, required from CustomersServiceProvider::boot()
 * and kept physically alongside the module that owns it, matching the
 * pattern every prior module already established.
 *
 * Versioned under /api/v1 per API:VERSIONING. The staff-facing surface
 * requires `auth:sanctum` plus the specific `permission:` its operation
 * corresponds to (SECURITY:ROLES_PERMISSIONS), reusing Identity & Access's
 * public `permission:` middleware exactly as every prior module does.
 *
 * Production Completion Plan v2, Milestone 5 (Customer Accounts): a real
 * self-service (customer-authenticated) surface now exists too —
 * `register`/`login` are genuinely public (pre-authentication, like
 * Identity & Access's own `auth/login`); everything under `customers/me`
 * requires `auth:sanctum` PLUS `customer.guard`
 * (Http\Middleware\EnsureCustomerPrincipal) instead of any `permission:`,
 * since a customer holds no staff permissions at all.
 *
 * `customers/audit-logs` is declared before `customers/{customer}` so
 * Laravel's order-sensitive route matching never tries to resolve
 * "audit-logs" as a {customer} UUID. `customers/register`, `customers/
 * login`, and `customers/me*` are declared before `customers/{customer}`
 * for the identical reason.
 */

use App\Domains\Commerce\Customers\Http\Controllers\AuditLogController;
use App\Domains\Commerce\Customers\Http\Controllers\CustomerAddressController;
use App\Domains\Commerce\Customers\Http\Controllers\CustomerAuthController;
use App\Domains\Commerce\Customers\Http\Controllers\CustomerController;
use App\Domains\Commerce\Customers\Http\Controllers\CustomerSelfAddressController;
use Illuminate\Support\Facades\Route;

// `->middleware('api')` is required here for the same reason documented in
// every prior module's routes.php: this module registers routes from its
// own service provider, not bootstrap/app.php's `withRouting(api: ...)`.
Route::prefix('api/v1')->middleware('api')->group(function (): void {
    Route::post('customers/register', [CustomerAuthController::class, 'register'])
        ->name('v1.customers.register');

    // Reuses Identity & Access's own `login` RateLimiter (keyed by
    // email|ip, generic by construction — see IdentityAccessServiceProvider
    // ::boot()) rather than defining a second, functionally identical
    // limiter under a new name.
    Route::post('customers/login', [CustomerAuthController::class, 'login'])
        ->withoutMiddleware('throttle:api')
        ->middleware('throttle:login')
        ->name('v1.customers.login');

    Route::middleware(['auth:sanctum', 'customer.guard'])->group(function (): void {
        Route::post('customers/logout', [CustomerAuthController::class, 'logout'])->name('v1.customers.logout');
        Route::get('customers/me', [CustomerAuthController::class, 'me'])->name('v1.customers.me');
        Route::patch('customers/me', [CustomerAuthController::class, 'updateMe'])->name('v1.customers.me.update');

        Route::get('customers/me/addresses', [CustomerSelfAddressController::class, 'index'])->name('v1.customers.me.addresses.index');
        Route::post('customers/me/addresses', [CustomerSelfAddressController::class, 'store'])->name('v1.customers.me.addresses.store');
        Route::patch('customers/me/addresses/{address}', [CustomerSelfAddressController::class, 'update'])->name('v1.customers.me.addresses.update');
        Route::delete('customers/me/addresses/{address}', [CustomerSelfAddressController::class, 'destroy'])->name('v1.customers.me.addresses.destroy');
    });
});

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
