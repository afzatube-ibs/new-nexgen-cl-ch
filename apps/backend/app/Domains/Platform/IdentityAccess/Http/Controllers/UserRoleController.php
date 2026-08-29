<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Http\Controllers;

use App\Domains\Platform\IdentityAccess\Actions\AssignRoleAction;
use App\Domains\Platform\IdentityAccess\Actions\RevokeRoleAction;
use App\Domains\Platform\IdentityAccess\Http\Requests\AssignRoleRequest;
use App\Domains\Platform\IdentityAccess\Http\Resources\UserResource;
use App\Domains\Platform\IdentityAccess\Models\Role;
use App\Domains\Platform\IdentityAccess\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * "Role/permission assignment" — planning/IMPLEMENTATION_MASTER_PLAN.md's
 * public contract for this module — modeled as its own nested resource
 * under a user, distinct from UserController's own field updates, since
 * assigning a role is a materially different, more sensitive operation
 * than editing a name (it changes what SECURITY:AUTHORIZATION grants),
 * guarded by its own permission (`identity_access.user_roles.manage`).
 */
final class UserRoleController
{
    public function __construct(
        private readonly AssignRoleAction $assignRoleAction,
        private readonly RevokeRoleAction $revokeRoleAction,
    ) {}

    public function store(AssignRoleRequest $request, User $user): UserResource
    {
        $role = Role::query()->findOrFail($request->string('role_id')->toString());

        $this->assignRoleAction->execute($user, $role, $request->user()?->id);

        // See UserController::show()'s own docblock for why this must be
        // `roles.permissions`, not a bare `roles` — the identical
        // real, live-found gap, in this endpoint's own response.
        return new UserResource($user->load('roles.permissions'));
    }

    public function destroy(Request $request, User $user, Role $role): Response
    {
        $this->revokeRoleAction->execute($user, $role, $request->user()?->id);

        return response()->noContent();
    }
}
