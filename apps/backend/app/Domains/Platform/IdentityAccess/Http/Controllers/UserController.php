<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Http\Controllers;

use App\Domains\Platform\IdentityAccess\Actions\ArchiveUserAction;
use App\Domains\Platform\IdentityAccess\Actions\DeleteUserAction;
use App\Domains\Platform\IdentityAccess\Actions\RegisterUserAction;
use App\Domains\Platform\IdentityAccess\Actions\UpdateUserAction;
use App\Domains\Platform\IdentityAccess\Audit\AuditLogger;
use App\Domains\Platform\IdentityAccess\Http\Requests\ExpectedVersionRequest;
use App\Domains\Platform\IdentityAccess\Http\Requests\RegisterUserRequest;
use App\Domains\Platform\IdentityAccess\Http\Requests\UpdateUserRequest;
use App\Domains\Platform\IdentityAccess\Http\Resources\UserResource;
use App\Domains\Platform\IdentityAccess\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

/**
 * Staff user CRUD — MODULE:IDENTITY_ACCESS's public contract, per
 * planning/IMPLEMENTATION_MASTER_PLAN.md: "user/staff CRUD."
 *
 * Every action here is behind `permission:identity_access.users.*`
 * middleware (see routes/api_v1.php) — this controller trusts that
 * enforcement happened already, per SECURITY:DEFENSE_IN_DEPTH's "each
 * layer assumes the others might fail and holds regardless," but does not
 * re-implement it.
 */
final class UserController
{
    public function __construct(
        private readonly RegisterUserAction $registerUserAction,
        private readonly UpdateUserAction $updateUserAction,
        private readonly ArchiveUserAction $archiveUserAction,
        private readonly DeleteUserAction $deleteUserAction,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        // Production Completion Plan v2, Milestone 6 (Identity & Access
        // Admin UI) — real, live-found gap: without eager-loading `roles`
        // here, `UserResource`'s own `$this->whenLoaded('roles')` omits
        // the key entirely from every list-mode response (not `[]` —
        // absent), confirmed live via a direct API call before this fix.
        // `show()` already loads it (`$user->load('roles')`); the real
        // Admin Staff list needs the identical data to display each
        // user's role without an N+1 per row, mirroring
        // `RoleController::index()`'s own `->with('permissions')`.
        $query = User::query()->with('roles');

        // API:FILTERING: only fields explicitly published as filterable.
        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        // API:SORTING: only fields explicitly published as sortable.
        $sortable = ['name', 'email', 'created_at'];
        $sort = $request->string('sort', 'created_at')->toString();
        $direction = $request->string('direction', 'desc')->toString() === 'asc' ? 'asc' : 'desc';
        $query->orderBy(in_array($sort, $sortable, true) ? $sort : 'created_at', $direction);

        $users = $query->paginate(perPage: (int) $request->integer('per_page', 25));

        $this->auditLogger->log(action: 'user.listed', actorId: $request->user()?->id);

        return UserResource::collection($users);
    }

    public function show(Request $request, User $user): UserResource
    {
        $this->auditLogger->log(
            action: 'user.viewed',
            actorId: $request->user()?->id,
            targetType: User::class,
            targetId: $user->id,
        );

        // Production Completion Plan v2, Milestone 6 (Identity & Access
        // Admin UI) — real, live-found gap: `RoleResource`'s own
        // `permissions` field is itself `whenLoaded('permissions')` — a
        // bare `load('roles')` here leaves each role's own `permissions`
        // key entirely absent (not `[]`), crashing the Admin's own
        // `UserDetailPage` on `role.permissions.length`. `auth/me`
        // already gets this right (`AuthController::me()`'s own
        // `$user->load('roles.permissions')`) — this is the identical
        // fix applied here.
        return new UserResource($user->load('roles.permissions'));
    }

    public function store(RegisterUserRequest $request): JsonResponse
    {
        $user = $this->registerUserAction->execute(
            name: $request->string('name')->toString(),
            email: $request->string('email')->toString(),
            password: $request->string('password')->toString(),
            actorId: $request->user()?->id,
        );

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        $updated = $this->updateUserAction->execute(
            user: $user,
            changes: $request->only(['name', 'email']),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new UserResource($updated);
    }

    public function archive(ExpectedVersionRequest $request, User $user): UserResource
    {
        $archived = $this->archiveUserAction->execute(
            user: $user,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new UserResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, User $user): Response
    {
        $this->deleteUserAction->execute(
            user: $user,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
