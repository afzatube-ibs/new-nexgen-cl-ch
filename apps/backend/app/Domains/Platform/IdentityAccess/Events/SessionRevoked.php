<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published whenever a session (a Sanctum personal access token — see
 * Actions\RevokeSessionAction's docblock for why Sanctum tokens are this
 * module's concrete implementation of SECURITY:SESSION_MANAGEMENT) is
 * invalidated, whether by the holder logging out or by an administrative
 * action revoking someone else's session.
 */
final class SessionRevoked extends DomainEvent
{
    public function __construct(
        public readonly string $userId,
        public readonly string $tokenId,
        public readonly string $revokedByUserId,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'identity_access.session.revoked';
    }
}
