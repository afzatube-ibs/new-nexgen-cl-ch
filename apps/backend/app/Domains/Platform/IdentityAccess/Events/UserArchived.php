<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published when a staff account transitions to DATA:LIFECYCLE's Archived
 * state — an intentional, recorded action, never an implicit side effect.
 * Lets any future module holding a reference to this user (e.g. Orders'
 * "placed by") react (for example, to stop surfacing them as an assignable
 * operator) without querying Identity & Access's own data directly, per
 * DATA:CROSS_MODULE_ACCESS.
 */
final class UserArchived extends DomainEvent
{
    public function __construct(
        public readonly string $userId,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'identity_access.user.archived';
    }
}
