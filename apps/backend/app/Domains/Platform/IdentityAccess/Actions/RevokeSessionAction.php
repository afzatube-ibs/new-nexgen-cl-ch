<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Actions;

use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use App\Domains\Platform\IdentityAccess\Audit\AuditLogger;
use App\Domains\Platform\IdentityAccess\Events\SessionRevoked;
use App\Domains\Platform\IdentityAccess\Models\User;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * SECURITY:SESSION_MANAGEMENT: "can be forcibly terminated by an authorized
 * administrative action... a session is never something only its original
 * holder can end." This module's concrete "session" is a Sanctum personal
 * access token (externalized, per ARCH:NFR statelessness, in the same
 * MySQL datastore every Application Unit instance shares — never
 * in-process state); revoking it here is deleting that token row, which
 * takes effect on the very next request that presents it, from any
 * instance.
 */
final readonly class RevokeSessionAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(User $user, PersonalAccessToken $token, ?string $actorId): void
    {
        $tokenId = (string) $token->id;
        $token->delete();

        $this->auditLogger->log(
            action: 'session.revoked',
            actorId: $actorId,
            targetType: User::class,
            targetId: $user->id,
        );

        $this->eventBus->publish(new SessionRevoked($user->id, $tokenId, $actorId ?? $user->id));
    }
}
