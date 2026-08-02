<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Actions;

use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use App\Domains\Platform\IdentityAccess\Audit\AuditLogger;
use App\Domains\Platform\IdentityAccess\Events\UserArchived;
use App\Domains\Platform\IdentityAccess\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Transitions a user to DATA:LIFECYCLE's Archived state — an intentional,
 * recorded action, distinct from deletion (DeleteUserAction). An archived
 * user can no longer authenticate (see AuthenticateUserAction) but their
 * historical references (e.g. "fulfilled by") remain intact.
 */
final readonly class ArchiveUserAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(User $user, int $expectedVersion, ?string $actorId): User
    {
        return DB::transaction(function () use ($user, $expectedVersion, $actorId) {
            $user->assertVersionMatches($expectedVersion);

            $previousStatus = $user->status;
            $user->status = User::STATUS_ARCHIVED;
            $user->save();

            $this->auditLogger->log(
                action: 'user.archived',
                actorId: $actorId,
                targetType: User::class,
                targetId: $user->id,
                before: ['status' => $previousStatus],
                after: ['status' => $user->status],
            );

            $this->eventBus->publish(new UserArchived($user->id));

            return $user;
        });
    }
}
