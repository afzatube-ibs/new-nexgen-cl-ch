<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Http\Controllers;

use App\Domains\Platform\IdentityAccess\Actions\RevokeSessionAction;
use App\Domains\Platform\IdentityAccess\Audit\AuditLogger;
use App\Domains\Platform\IdentityAccess\Exceptions\AuthorizationDeniedException;
use App\Domains\Platform\IdentityAccess\Http\Resources\SessionResource;
use App\Domains\Platform\IdentityAccess\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * SECURITY:SESSION_MANAGEMENT's "forcibly terminated by an authorized
 * administrative action" made concrete. A person managing their own
 * sessions is not a privileged operation — self-access is always allowed;
 * acting on another user's sessions requires `identity_access.sessions.
 * manage`, checked explicitly here rather than via the generic
 * `permission:` route middleware, since the rule depends on *whose*
 * resource is being addressed, not merely which route was hit.
 */
final class SessionController
{
    public function __construct(
        private readonly RevokeSessionAction $revokeSessionAction,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request, User $user): AnonymousResourceCollection
    {
        $this->authorizeSelfOrManage($request, $user);

        return SessionResource::collection($user->tokens()->orderByDesc('created_at')->get());
    }

    public function destroy(Request $request, User $user, string $token): Response
    {
        $this->authorizeSelfOrManage($request, $user);

        $accessToken = $user->tokens()->where('id', $token)->first();

        if ($accessToken === null) {
            // A missing resource, not malformed input — API:ERROR_MODEL
            // distinguishes the two, so this is a 404 (via ModelNotFoundException's
            // standard rendering), never a 422 validation failure.
            throw (new ModelNotFoundException)->setModel(PersonalAccessToken::class, [$token]);
        }

        $this->revokeSessionAction->execute($user, $accessToken, $request->user()?->id);

        return response()->noContent();
    }

    private function authorizeSelfOrManage(Request $request, User $target): void
    {
        $caller = $request->user();
        $isSelf = $caller !== null && $caller->id === $target->id;

        if ($isSelf || $caller?->can('identity_access.sessions.manage')) {
            return;
        }

        $this->auditLogger->log(
            action: 'authorization.denied',
            actorId: $caller?->id,
            targetType: 'permission',
            targetId: 'identity_access.sessions.manage',
        );

        throw new AuthorizationDeniedException;
    }
}
