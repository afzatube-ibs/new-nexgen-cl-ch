<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published when a new Customer account is created — one of the two events
 * planning/IMPLEMENTATION_MASTER_PLAN.md's Customers entry names. Carries
 * only identifiers and the fields a subscriber with no special relationship
 * to this module is most likely to react to (a future Growth-domain CRM
 * module building relationship history, per that module's Future
 * Extension Points entry: "CRM... consumes Customer events for
 * relationship-building without owning customer identity itself"), per
 * SECURITY:EVENT_SECURITY's "a subscriber receives only what a publisher
 * intended."
 */
final class CustomerRegistered extends DomainEvent
{
    /**
     * `$email` is nullable as of Phase 4.0 Slice 4.1 (Mobile-First
     * Customer Identity) — a customer may now register with phone only.
     * See `Listeners\SendWelcomeEmailOnCustomerRegistered` for the one
     * real subscriber, and why it now skips sending when this is null
     * rather than queuing a notification to nowhere.
     */
    public function __construct(
        public readonly string $customerId,
        public readonly ?string $email,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'customers.customer.registered';
    }
}
