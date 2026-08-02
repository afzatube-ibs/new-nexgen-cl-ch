<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published on every failed authentication attempt, per SECURITY:
 * AUTHENTICATION ("a failed authentication attempt is itself a
 * security-relevant, audited event") and SECURITY:MONITORING's requirement
 * to support recognizing abnormal patterns (e.g. a burst of failures
 * against one email) while they are happening, not only after the fact.
 *
 * Deliberately carries the attempted email but never the attempted
 * password, and never states whether the email corresponds to a real
 * account — SECURITY:AUTHORIZATION's "denied explicitly... never in a way
 * that would leak information the caller isn't entitled to" applies with
 * equal force to a failed login as to a permission denial.
 */
final class UserAuthenticationFailed extends DomainEvent
{
    public function __construct(
        public readonly string $attemptedEmail,
        public readonly string $reason,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'identity_access.user.authentication_failed';
    }
}
