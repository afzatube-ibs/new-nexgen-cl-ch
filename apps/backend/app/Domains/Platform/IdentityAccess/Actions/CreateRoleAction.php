<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Actions;

use App\Domains\Platform\IdentityAccess\Audit\AuditLogger;
use App\Domains\Platform\IdentityAccess\Models\Permission;
use App\Domains\Platform\IdentityAccess\Models\Role;
use Illuminate\Support\Facades\DB;

final readonly class CreateRoleAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  list<string>  $permissionKeys
     */
    public function execute(string $name, string $label, array $permissionKeys, ?string $actorId): Role
    {
        return DB::transaction(function () use ($name, $label, $permissionKeys, $actorId) {
            $role = Role::query()->create(['name' => $name, 'label' => $label]);

            $permissionIds = Permission::query()->whereIn('key', $permissionKeys)->pluck('id');
            $role->permissions()->sync($permissionIds);

            $this->auditLogger->log(
                action: 'role.created',
                actorId: $actorId,
                targetType: Role::class,
                targetId: $role->id,
                after: ['name' => $role->name, 'label' => $role->label, 'permissions' => $permissionKeys],
            );

            return $role->load('permissions');
        });
    }
}
