<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by the expiration sweep (Actions\ExpireCheckoutSessionsAction)
 * for every session it transitions to `expired` — the second of the three
 * events this module's master plan entry names. The future Growth &
 * Automation domain (CRM/Marketing) is this event's anticipated
 * subscriber, per that domain's own "Dependencies: ... Checkout (via
 * events)" entry in the master plan.
 */
final class CheckoutAbandoned extends DomainEvent
{
    public function __construct(
        public readonly string $sessionId,
        public readonly ?string $customerId,
        public readonly ?string $guestEmail,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'checkout.session.abandoned';
    }
}
