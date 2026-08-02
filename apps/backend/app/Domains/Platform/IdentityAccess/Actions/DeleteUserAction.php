<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Actions;

use App\Domains\Platform\IdentityAccess\Audit\AuditLogger;
use App\Domains\Platform\IdentityAccess\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Soft-deletes a user — DATA:LIFECYCLE's Deleted state, "a recorded event,
 * not a silent disappearance," and DATA:RETENTION's audit trail survives
 * even though the underlying data is gone.
 *
 * Every active session (Sanctum token) is revoked in the same transaction:
 * a deleted account must never retain a valid bearer token, regardless of
 * how the deletion itself is later audited or potentially reversed.
 */
final readonly class DeleteUserAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(User $user, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($user, $expectedVersion, $actorId) {
            $user->assertVersionMatches($expectedVersion);

            $user->tokens()->delete();
            $user->delete();

            $this->auditLogger->log(
                action: 'user.deleted',
                actorId: $actorId,
                targetType: User::class,
                targetId: $user->id,
            );
        });
    }
}
