<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Production Completion Plan v2, Milestone 5b (Password Reset). Published
 * after a real password reset completes — a real, security-relevant
 * event a future notification ("your password was changed") or security
 * audit trail could subscribe to.
 */
final class CustomerPasswordWasReset extends DomainEvent
{
    public function __construct(
        public readonly string $customerId,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'customers.customer.password_was_reset';
    }
}
