<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published once, when Actions\StartCheckoutAction opens a new session —
 * one of the three events planning/IMPLEMENTATION_MASTER_PLAN.md's
 * Checkout entry names.
 */
final class CheckoutStarted extends DomainEvent
{
    public function __construct(
        public readonly string $sessionId,
        public readonly ?string $customerId,
        public readonly string $currencyCode,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'checkout.session.started';
    }
}
