<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Http\Controllers;

use App\Domains\Platform\IdentityAccess\Actions\CreateRoleAction;
use App\Domains\Platform\IdentityAccess\Actions\DeleteRoleAction;
use App\Domains\Platform\IdentityAccess\Actions\UpdateRoleAction;
use App\Domains\Platform\IdentityAccess\Http\Requests\CreateRoleRequest;
use App\Domains\Platform\IdentityAccess\Http\Requests\ExpectedVersionRequest;
use App\Domains\Platform\IdentityAccess\Http\Requests\UpdateRoleRequest;
use App\Domains\Platform\IdentityAccess\Http\Resources\RoleResource;
use App\Domains\Platform\IdentityAccess\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class RoleController
{
    public function __construct(
        private readonly CreateRoleAction $createRoleAction,
        private readonly UpdateRoleAction $updateRoleAction,
        private readonly DeleteRoleAction $deleteRoleAction,
    ) {}

    public function index(): AnonymousResourceCollection
    {
        return RoleResource::collection(
            Role::query()->with('permissions')->orderBy('name')->paginate()
        );
    }

    public function show(Role $role): RoleResource
    {
        return new RoleResource($role->load('permissions'));
    }

    public function store(CreateRoleRequest $request): JsonResponse
    {
        $role = $this->createRoleAction->execute(
            name: $request->string('name')->toString(),
            label: $request->string('label')->toString(),
            permissionKeys: $request->input('permissions', []),
            actorId: $request->user()?->id,
        );

        return (new RoleResource($role))->response()->setStatusCode(201);
    }

    public function update(UpdateRoleRequest $request, Role $role): RoleResource
    {
        $updated = $this->updateRoleAction->execute(
            role: $role,
            changes: $request->only(['label']),
            permissionKeys: $request->has('permissions') ? $request->input('permissions') : null,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new RoleResource($updated);
    }

    public function destroy(ExpectedVersionRequest $request, Role $role): Response
    {
        $this->deleteRoleAction->execute(
            role: $role,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
