<?php

declare(strict_types=1);

namespace App\Domains\Platform\Media\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published when a new asset finishes uploading — per
 * planning/IMPLEMENTATION_MASTER_PLAN.md's Media entry event list.
 */
final class MediaUploaded extends DomainEvent
{
    public function __construct(
        public readonly string $mediaId,
        public readonly string $mimeType,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'media.asset.uploaded';
    }
}
