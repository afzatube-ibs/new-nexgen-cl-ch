<?php

declare(strict_types=1);

/**
 * Identity & Access's API surface, required from IdentityAccessServiceProvider
 * ::boot() and kept physically alongside the module that owns it, per
 * ENGINEERING:CODE_ORGANIZATION — matching the pattern Platform Foundation
 * already established for its own health route.
 *
 * Versioned under /api/v1 per API:VERSIONING ("the API is versioned at the
 * surface level"). Every route requires `auth:sanctum` (API:AUTHENTICATION's
 * single point) except login itself; every mutating route additionally
 * requires the specific `permission:` its operation corresponds to
 * (SECURITY:ROLES_PERMISSIONS), enforced by Http\Middleware\EnsurePermission.
 */

use App\Domains\Platform\IdentityAccess\Http\Controllers\AuditLogController;
use App\Domains\Platform\IdentityAccess\Http\Controllers\AuthController;
use App\Domains\Platform\IdentityAccess\Http\Controllers\PermissionController;
use App\Domains\Platform\IdentityAccess\Http\Controllers\RoleController;
use App\Domains\Platform\IdentityAccess\Http\Controllers\SessionController;
use App\Domains\Platform\IdentityAccess\Http\Controllers\UserController;
use App\Domains\Platform\IdentityAccess\Http\Controllers\UserRoleController;
use Illuminate\Support\Facades\Route;

// `->middleware('api')` is required here, not decorative: it's what
// applies Illuminate\Routing\Middleware\SubstituteBindings, without which
// {user}/{role} route parameters would never resolve into the Eloquent
// model instances this file's controller methods type-hint — since this
// module registers routes from its own service provider rather than
// through bootstrap/app.php's `withRouting(api: ...)`, that group is not
// applied automatically the way it would be for a routes/api.php file.
Route::prefix('api/v1')->middleware('api')->group(function (): void {
    Route::post('auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:login')
        ->name('v1.auth.login');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('auth/logout', [AuthController::class, 'logout'])->name('v1.auth.logout');
        Route::get('auth/me', [AuthController::class, 'me'])->name('v1.auth.me');

        Route::get('users', [UserController::class, 'index'])
            ->middleware('permission:identity_access.users.view')->name('v1.users.index');
        Route::post('users', [UserController::class, 'store'])
            ->middleware('permission:identity_access.users.manage')->name('v1.users.store');
        Route::get('users/{user}', [UserController::class, 'show'])
            ->middleware('permission:identity_access.users.view')->name('v1.users.show');
        Route::patch('users/{user}', [UserController::class, 'update'])
            ->middleware('permission:identity_access.users.manage')->name('v1.users.update');
        Route::post('users/{user}/archive', [UserController::class, 'archive'])
            ->middleware('permission:identity_access.users.manage')->name('v1.users.archive');
        Route::delete('users/{user}', [UserController::class, 'destroy'])
            ->middleware('permission:identity_access.users.manage')->name('v1.users.destroy');

        Route::post('users/{user}/roles', [UserRoleController::class, 'store'])
            ->middleware('permission:identity_access.user_roles.manage')->name('v1.users.roles.store');
        Route::delete('users/{user}/roles/{role}', [UserRoleController::class, 'destroy'])
            ->middleware('permission:identity_access.user_roles.manage')->name('v1.users.roles.destroy');

        // No `permission:` middleware: SessionController enforces
        // self-or-manage internally, since the rule depends on whose
        // sessions are being addressed (see its docblock).
        Route::get('users/{user}/sessions', [SessionController::class, 'index'])->name('v1.users.sessions.index');
        Route::delete('users/{user}/sessions/{token}', [SessionController::class, 'destroy'])->name('v1.users.sessions.destroy');

        Route::get('roles', [RoleController::class, 'index'])
            ->middleware('permission:identity_access.roles.view')->name('v1.roles.index');
        Route::post('roles', [RoleController::class, 'store'])
            ->middleware('permission:identity_access.roles.manage')->name('v1.roles.store');
        Route::get('roles/{role}', [RoleController::class, 'show'])
            ->middleware('permission:identity_access.roles.view')->name('v1.roles.show');
        Route::patch('roles/{role}', [RoleController::class, 'update'])
            ->middleware('permission:identity_access.roles.manage')->name('v1.roles.update');
        Route::delete('roles/{role}', [RoleController::class, 'destroy'])
            ->middleware('permission:identity_access.roles.manage')->name('v1.roles.destroy');

        Route::get('permissions', [PermissionController::class, 'index'])
            ->middleware('permission:identity_access.roles.view')->name('v1.permissions.index');

        Route::get('audit-logs', [AuditLogController::class, 'index'])
            ->middleware('permission:identity_access.audit_log.view')->name('v1.audit-logs.index');
    });
});
