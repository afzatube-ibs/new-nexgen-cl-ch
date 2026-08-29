<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Http\Middleware;

use App\Domains\Commerce\Customers\Models\Customer;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts). Sanctum
 * authenticates a bearer token to WHATEVER model it belongs to
 * (`tokenable_type` — see Customer::class's own docblock); nothing about
 * `auth:sanctum` alone stops a customer's own token from resolving on a
 * route meant only for `Customer` principals, or a staff `User`'s token
 * from resolving here. This is the explicit, defense-in-depth check that
 * makes "customer routes only accept a customer's own token" real rather
 * than assumed — the mirror image of Identity & Access's own
 * `EnsureStaffPrincipal`.
 *
 * A denial here is a clean, explicit 401 (`AuthenticationException`,
 * consistent with how Sanctum itself signals "not authenticated as the
 * right kind of principal") — never a fatal error from calling a
 * staff-only method (`can()`/`hasPermission()`) that a `Customer`
 * instance genuinely does not implement.
 */
final class EnsureCustomerPrincipal
{
    public function handle(Request $request, Closure $next): Response
    {
        // Resolved via the generic `Guard` contract (`user(): ?Authenticatable`)
        // rather than `Illuminate\Http\Request::user()` — static analysis
        // narrows that specific call's return type to this platform's
        // configured default auth model (the staff `User`), which would
        // make this real, runtime-correct instanceof check look always
        // false. Sanctum itself imposes no such narrowing: a token's
        // resolved principal is whatever concrete model actually issued
        // it (`tokenable_type`).
        if (! Auth::guard('sanctum')->user() instanceof Customer) {
            abort(401, 'This endpoint requires a real customer session.');
        }

        return $next($request);
    }
}
