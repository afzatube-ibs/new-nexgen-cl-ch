<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

final class RoleAssigned extends DomainEvent
{
    public function __construct(
        public readonly string $userId,
        public readonly string $roleId,
        public readonly string $assignedByUserId,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'identity_access.role.assigned';
    }
}
