<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Actions;

use App\Domains\Platform\IdentityAccess\Audit\AuditLogger;
use App\Domains\Platform\IdentityAccess\Models\User;
use Illuminate\Support\Facades\DB;

final readonly class UpdateUserAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array{name?: string, email?: string}  $changes
     */
    public function execute(User $user, array $changes, int $expectedVersion, ?string $actorId): User
    {
        return DB::transaction(function () use ($user, $changes, $expectedVersion, $actorId) {
            $user->assertVersionMatches($expectedVersion);

            $before = $user->only(['name', 'email']);
            $user->fill($changes)->save();

            $this->auditLogger->log(
                action: 'user.updated',
                actorId: $actorId,
                targetType: User::class,
                targetId: $user->id,
                before: $before,
                after: $user->only(['name', 'email']),
            );

            return $user;
        });
    }
}
