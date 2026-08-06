<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

final class ReturnRejected extends DomainEvent
{
    public function __construct(
        public readonly string $returnRequestId,
        public readonly string $orderId,
        public readonly string $reason,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'returns.return_request.rejected';
    }
}
