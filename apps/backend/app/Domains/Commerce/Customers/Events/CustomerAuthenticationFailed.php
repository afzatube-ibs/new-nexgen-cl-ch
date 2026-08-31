<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts). Mirrors
 * Identity & Access's own `UserAuthenticationFailed` — see
 * Actions\LoginCustomerAction's docblock for why every failure reason
 * (unknown identifier, wrong password, archived account) is deliberately
 * indistinguishable to the caller while still being a real, audited event
 * internally.
 *
 * `attemptedIdentifier` (was `attemptedEmail`, renamed under Phase 4.0
 * Slice 4.1 — Mobile-First Customer Identity, no other consumer of this
 * event existed at the time, confirmed by a full-repository search):
 * whatever string the caller attempted to log in with, phone- or
 * email-shaped.
 */
final class CustomerAuthenticationFailed extends DomainEvent
{
    public function __construct(
        public readonly string $attemptedIdentifier,
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
