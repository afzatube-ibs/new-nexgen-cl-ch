<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Http\Middleware;

use App\Domains\Platform\IdentityAccess\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts). Before
 * this milestone, `auth:sanctum` alone was a sufficient guard on this
 * module's own routes because every Sanctum token in the platform
 * belonged to a staff `User` — there was no other kind. Now that a real
 * Customer principal exists (Commerce\Customers\Models\Customer, its own
 * `HasApiTokens`), two of this module's own routes — `auth/me` and
 * `auth/logout` — carry no `permission:` middleware at all (see
 * SessionController's own docblock for why the third apparent gap,
 * `users/{user}/sessions/*`, is actually already safe: it checks
 * self-or-manage explicitly) and would otherwise accept ANY authenticated
 * Sanctum principal, staff or customer.
 *
 * `AuthController::me()` would in fact crash on a `Customer` (calling
 * `$user->load('roles.permissions')`, a relationship `Customer` does not
 * have) — fail-safe (never grants access) but an ugly 500, not the clean,
 * explicit 401 SECURITY:AUTHORIZATION and PRINCIPLES:EXPLICIT_FAILURE both
 * call for. This is the mirror image of Commerce\Customers\Http\
 * Middleware\EnsureCustomerPrincipal, applied to this module's own
 * `auth:sanctum` route group in routes.php.
 */
final class EnsureStaffPrincipal
{
    public function handle(Request $request, Closure $next): Response
    {
        // See Commerce\Customers\Http\Middleware\EnsureCustomerPrincipal's
        // own docblock for why this reads the guard directly rather than
        // `Illuminate\Http\Request::user()` — this platform now has two
        // real Authenticatable models, and static analysis narrows that
        // specific call's return type to only one of them.
        if (! Auth::guard('sanctum')->user() instanceof User) {
            abort(401, 'This endpoint requires a real staff session.');
        }

        return $next($request);
    }
}
