<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Http\Middleware;

use App\Domains\Platform\IdentityAccess\Audit\AuditLogger;
use App\Domains\Platform\IdentityAccess\Exceptions\AuthorizationDeniedException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * API:AUTHORIZATION made concrete: "every API operation is checked against
 * the caller's permissions before it executes, consistently at the API
 * boundary." Every route this module (and every future module, per
 * MODULE:PLATFORM — any module may depend on this Platform module
 * directly) exposes that needs a specific permission is guarded with
 * `->middleware('permission:{key}')`, resolving through the same Gate
 * wiring `IdentityAccessServiceProvider` registers — never a bespoke,
 * module-specific permission check, per SECURITY:AUTHORIZATION.
 *
 * A denial is itself an audited event (SECURITY:AUDIT_LOGGING) and is
 * always explicit — 403 with a structured reason, never a silent filter or
 * degraded response, per PRINCIPLES:EXPLICIT_FAILURE.
 */
final class EnsurePermission
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if ($user === null || ! $user->can($permission)) {
            $this->auditLogger->log(
                action: 'authorization.denied',
                actorId: $user?->id,
                targetType: 'permission',
                targetId: $permission,
            );

            throw new AuthorizationDeniedException;
        }

        return $next($request);
    }
}
