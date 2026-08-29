<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Production Completion Plan v2, Milestone 5b (Password Reset). Published
 * only when the requested email genuinely matches a real Customer — see
 * Actions\RequestPasswordResetAction's own docblock for why a request
 * against an unknown email never reaches this far (no event, no audit
 * entry naming a nonexistent account, the identical outward response
 * either way). Carries the real, plaintext reset token so the one real
 * cross-domain listener that consumes this (in `app/Listeners/`) can put
 * it in the email it queues — the only place this platform ever lets a
 * real, usable credential travel through the event bus, mirroring
 * exactly why `PaymentFailed`'s own `$reason` is deliberately never a raw
 * gateway response: this event's own payload is scoped, on purpose, to
 * the one real subscriber that needs it.
 */
final class CustomerPasswordResetRequested extends DomainEvent
{
    public function __construct(
        public readonly string $customerId,
        public readonly string $email,
        public readonly string $plainTextToken,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'customers.customer.password_reset_requested';
    }
}
