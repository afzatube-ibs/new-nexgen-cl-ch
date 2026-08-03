<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published when a new Locale is registered — the one Locale-related event
 * planning/IMPLEMENTATION_MASTER_PLAN.md's Localization & Currency entry
 * names. Carries the fields a subscriber with no special relationship to
 * this module is most likely to react to (a future Search or CMS module
 * building out locale-specific indexes/content), per SECURITY:
 * EVENT_SECURITY's "a subscriber receives only what a publisher intended."
 */
final class LocaleAdded extends DomainEvent
{
    public function __construct(
        public readonly string $localeId,
        public readonly string $code,
        public readonly string $name,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'localization.locale.added';
    }
}
