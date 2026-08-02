<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published when a new staff/operator account is created. Named
 * "Registered," not "Created," per planning/IMPLEMENTATION_MASTER_PLAN.md's
 * event list for MODULE:IDENTITY_ACCESS.
 *
 * Carries only what SECURITY:EVENT_SECURITY permits a subscriber with no
 * special relationship to Identity & Access to know about a user — never
 * the password hash, never anything beyond identity and the fact of
 * registration.
 */
final class UserRegistered extends DomainEvent
{
    public function __construct(
        public readonly string $userId,
        public readonly string $email,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'identity_access.user.registered';
    }
}
