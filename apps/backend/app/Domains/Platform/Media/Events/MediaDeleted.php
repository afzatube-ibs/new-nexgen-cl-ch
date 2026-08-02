<?php

declare(strict_types=1);

namespace App\Domains\Platform\Media\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published when an asset is deleted — per
 * planning/IMPLEMENTATION_MASTER_PLAN.md's Media entry event list. A
 * subscriber (e.g. a future consuming module) reacts to this to know a
 * media_id it was holding is no longer resolvable, per SECURITY:
 * EVENT_SECURITY's minimal-payload principle.
 */
final class MediaDeleted extends DomainEvent
{
    public function __construct(
        public readonly string $mediaId,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'media.asset.deleted';
    }
}
