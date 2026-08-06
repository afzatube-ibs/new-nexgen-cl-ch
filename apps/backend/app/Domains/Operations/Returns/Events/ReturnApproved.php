<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\ApproveReturnRequestAction — named explicitly in
 * the master plan's Returns entry. Marks the initial "yes, send it back"
 * decision — distinct from Events\ReturnResolved, which marks the later
 * refund/exchange/reject decision made after inspection; Payments'
 * refund-triggering listener subscribes to ReturnResolved specifically,
 * not this event, since an approved-for-pickup return has not yet been
 * inspected or priced (see Actions\ResolveReturnRequestAction's docblock).
 */
final class ReturnApproved extends DomainEvent
{
    public function __construct(
        public readonly string $returnRequestId,
        public readonly string $orderId,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'returns.return_request.approved';
    }
}
