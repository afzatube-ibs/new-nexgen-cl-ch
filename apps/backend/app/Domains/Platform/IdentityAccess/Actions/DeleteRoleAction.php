<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Actions;

use App\Domains\Platform\IdentityAccess\Audit\AuditLogger;
use App\Domains\Platform\IdentityAccess\Models\Role;
use Illuminate\Support\Facades\DB;

final readonly class DeleteRoleAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Role $role, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($role, $expectedVersion, $actorId) {
            $role->assertVersionMatches($expectedVersion);

            // Detaching before delete is not strictly required (the pivot
            // rows cascade-delete per the migration's foreign keys) but
            // makes the audit record's "before" state explicit rather than
            // relying on a reader inferring it from the cascade.
            $affectedUserIds = $role->users()->pluck('users.id')->all();
            $role->users()->detach();
            $role->delete();

            $this->auditLogger->log(
                action: 'role.deleted',
                actorId: $actorId,
                targetType: Role::class,
                targetId: $role->id,
                before: ['name' => $role->name, 'affected_user_ids' => $affectedUserIds],
            );
        });
    }
}
