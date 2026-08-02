<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Actions;

use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use App\Domains\Platform\IdentityAccess\Audit\AuditLogger;
use App\Domains\Platform\IdentityAccess\Events\RoleAssigned;
use App\Domains\Platform\IdentityAccess\Models\Role;
use App\Domains\Platform\IdentityAccess\Models\User;
use Illuminate\Support\Facades\DB;

final readonly class AssignRoleAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(User $user, Role $role, ?string $actorId): void
    {
        DB::transaction(function () use ($user, $role, $actorId) {
            if ($user->roles()->where('roles.id', $role->id)->exists()) {
                return;
            }

            $user->roles()->attach($role->id);

            $this->auditLogger->log(
                action: 'role.assigned',
                actorId: $actorId,
                targetType: User::class,
                targetId: $user->id,
                after: ['role_id' => $role->id, 'role_name' => $role->name],
            );

            $this->eventBus->publish(new RoleAssigned($user->id, $role->id, $actorId ?? $user->id));
        });
    }
}
