<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts). Mirrors
 * Identity & Access's own `UserAuthenticationFailed` — see
 * Actions\LoginCustomerAction's docblock for why every failure reason
 * (unknown email, wrong password, archived account) is deliberately
 * indistinguishable to the caller while still being a real, audited event
 * internally.
 */
final class CustomerAuthenticationFailed extends DomainEvent
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
        return 'customers.customer.authentication_failed';
    }
}
