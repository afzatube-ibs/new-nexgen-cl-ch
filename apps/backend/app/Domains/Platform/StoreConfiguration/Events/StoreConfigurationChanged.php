<?php

declare(strict_types=1);

namespace App\Domains\Platform\StoreConfiguration\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published whenever a Store's configuration is set or changed — on
 * creation (its configuration is set for the first time) and on update —
 * per planning/IMPLEMENTATION_MASTER_PLAN.md's Organizations & Stores
 * entry, which names this as the module's one event.
 *
 * Carries the fields a subscriber with no special relationship to Store
 * Configuration is most likely to react to (Localization & Currency,
 * Pricing & Tax, Shipping — all future modules whose calculations depend
 * on a store's currency/locale/timezone), per SECURITY:EVENT_SECURITY's
 * "a subscriber receives only what a publisher intended." A subscriber
 * needing anything else about the store queries this module's public
 * contract rather than this event carrying an ever-growing payload.
 */
final class StoreConfigurationChanged extends DomainEvent
{
    public function __construct(
        public readonly string $storeId,
        public readonly string $currencyCode,
        public readonly string $locale,
        public readonly string $timezone,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'store_configuration.store.configuration_changed';
    }
}
