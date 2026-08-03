<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published whenever a Currency's exchange rate is established (on
 * creation) or changes (on update) — the one Currency-related event
 * planning/IMPLEMENTATION_MASTER_PLAN.md's Localization & Currency entry
 * names. This is the auditable rate signal the master plan's Security
 * Considerations entry requires ("any rate source must be auditable") and
 * the future Pricing & Tax and Orders modules will subscribe to for
 * currency conversion, per SECURITY:EVENT_SECURITY's "a subscriber
 * receives only what a publisher intended."
 */
final class CurrencyRateUpdated extends DomainEvent
{
    public function __construct(
        public readonly string $currencyId,
        public readonly string $code,
        public readonly string $exchangeRate,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'localization.currency.rate_updated';
    }
}
