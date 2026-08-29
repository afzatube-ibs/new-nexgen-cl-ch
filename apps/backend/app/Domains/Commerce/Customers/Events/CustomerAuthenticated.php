<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts). Mirrors
 * Identity & Access's own `UserAuthenticated` for the identical reason —
 * a real login is a security-relevant, audited event in its own right,
 * distinct from `CustomerRegistered` (which fires once, at account
 * creation, not on every subsequent session).
 */
final class CustomerAuthenticated extends DomainEvent
{
    public function __construct(
        public readonly string $customerId,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'customers.customer.authenticated';
    }
}
