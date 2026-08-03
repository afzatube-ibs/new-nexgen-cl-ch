<?php

declare(strict_types=1);

namespace App\Domains\Platform\Installer\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published once, when first-run installation completes successfully — the
 * one event planning/IMPLEMENTATION_MASTER_PLAN.md's Installer entry names.
 * Carries only identifiers, per SECURITY:EVENT_SECURITY's "a subscriber
 * receives only what a publisher intended" — a subscriber wanting the
 * administrator's or store's details queries Identity & Access's or Store
 * Configuration's own public contract for them.
 */
final class PlatformInstalled extends DomainEvent
{
    public function __construct(
        public readonly string $installationId,
        public readonly string $administratorUserId,
        public readonly string $storeId,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'installer.platform.installed';
    }
}
