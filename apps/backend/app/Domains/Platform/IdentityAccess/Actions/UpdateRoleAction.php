<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Actions;

use App\Domains\Platform\IdentityAccess\Audit\AuditLogger;
use App\Domains\Platform\IdentityAccess\Models\Permission;
use App\Domains\Platform\IdentityAccess\Models\Role;
use Illuminate\Support\Facades\DB;

final readonly class UpdateRoleAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array{label?: string}  $changes
     * @param  list<string>|null  $permissionKeys  Null leaves permissions unchanged.
     */
    public function execute(Role $role, array $changes, ?array $permissionKeys, int $expectedVersion, ?string $actorId): Role
    {
        return DB::transaction(function () use ($role, $changes, $permissionKeys, $expectedVersion, $actorId) {
            $role->assertVersionMatches($expectedVersion);

            $before = $role->only(['label']) + ['permissions' => $role->permissions()->pluck('key')->all()];

            $role->fill($changes)->save();

            if ($permissionKeys !== null) {
                $permissionIds = Permission::query()->whereIn('key', $permissionKeys)->pluck('id');
                $role->permissions()->sync($permissionIds);
            }

            $after = $role->refresh()->only(['label']) + ['permissions' => $role->permissions()->pluck('key')->all()];

            $this->auditLogger->log(
                action: 'role.updated',
                actorId: $actorId,
                targetType: Role::class,
                targetId: $role->id,
                before: $before,
                after: $after,
            );

            return $role->load('permissions');
        });
    }
}
