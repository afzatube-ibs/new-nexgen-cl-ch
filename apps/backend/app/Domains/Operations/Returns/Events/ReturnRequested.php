<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\CreateReturnRequestAction — named explicitly in
 * planning/IMPLEMENTATION_MASTER_PLAN.md's Returns entry ("Events:
 * ReturnRequested, ReturnApproved, RefundIssued").
 */
final class ReturnRequested extends DomainEvent
{
    public function __construct(
        public readonly string $returnRequestId,
        public readonly string $orderId,
        public readonly string $customerId,
        public readonly string $rmaNumber,
        public readonly string $type,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'returns.return_request.requested';
    }
}
