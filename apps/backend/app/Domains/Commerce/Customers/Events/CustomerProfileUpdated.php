<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published whenever a Customer aggregate's state changes after
 * registration — profile field edits (name, email, phone) and address book
 * changes alike, since Customer and its addresses are one aggregate (see
 * the customer_addresses migration's docblock) and this is the one
 * "profile changed" event planning/IMPLEMENTATION_MASTER_PLAN.md's
 * Customers entry names, not a per-field or per-address-row event.
 */
final class CustomerProfileUpdated extends DomainEvent
{
    public function __construct(
        public readonly string $customerId,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'customers.customer.profile_updated';
    }
}
