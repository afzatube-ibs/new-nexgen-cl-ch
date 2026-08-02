<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Symmetric counterpart to RoleAssigned — not itself named in
 * planning/IMPLEMENTATION_MASTER_PLAN.md's event list, but a direct,
 * necessary consequence of implementing role revocation, which the
 * module's public contract ("role/permission assignment") requires.
 */
final class RoleRevoked extends DomainEvent
{
    public function __construct(
        public readonly string $userId,
        public readonly string $roleId,
        public readonly string $revokedByUserId,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'identity_access.role.revoked';
    }
}
