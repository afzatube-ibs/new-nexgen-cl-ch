<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published once, when Actions\SubmitCheckoutAction's saga finishes
 * successfully — the last of the three events this module's master plan
 * entry names. Never published more than once for the same session,
 * since the saga's claim step (see that class's docblock) makes a second
 * successful completion impossible.
 */
final class CheckoutCompleted extends DomainEvent
{
    public function __construct(
        public readonly string $sessionId,
        public readonly string $orderId,
        public readonly string $customerId,
        public readonly string $grandTotal,
        public readonly string $currencyCode,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'checkout.session.completed';
    }
}
