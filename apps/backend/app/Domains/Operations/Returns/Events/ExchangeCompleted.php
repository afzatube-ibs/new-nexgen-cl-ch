<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\CompleteExchangeRequestAction once the replacement
 * item has been marked shipped and the exchange is confirmed complete.
 */
final class ExchangeCompleted extends DomainEvent
{
    public function __construct(
        public readonly string $returnRequestId,
        public readonly string $exchangeRequestId,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'returns.exchange_request.completed';
    }
}
