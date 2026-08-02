<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Actions;

use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use App\Domains\Platform\IdentityAccess\Audit\AuditLogger;
use App\Domains\Platform\IdentityAccess\Events\RoleRevoked;
use App\Domains\Platform\IdentityAccess\Models\Role;
use App\Domains\Platform\IdentityAccess\Models\User;
use Illuminate\Support\Facades\DB;

final readonly class RevokeRoleAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(User $user, Role $role, ?string $actorId): void
    {
        DB::transaction(function () use ($user, $role, $actorId) {
            $user->roles()->detach($role->id);

            $this->auditLogger->log(
                action: 'role.revoked',
                actorId: $actorId,
                targetType: User::class,
                targetId: $user->id,
                before: ['role_id' => $role->id, 'role_name' => $role->name],
            );

            $this->eventBus->publish(new RoleRevoked($user->id, $role->id, $actorId ?? $user->id));
        });
    }
}
