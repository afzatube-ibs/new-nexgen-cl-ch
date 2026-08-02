<?php

declare(strict_types=1);

namespace App\Domains\Platform\Media\Actions;

use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use App\Domains\Platform\Media\Audit\AuditLogger;
use App\Domains\Platform\Media\Events\MediaDeleted;
use App\Domains\Platform\Media\Models\MediaAsset;
use Illuminate\Support\Facades\DB;

/**
 * Soft-deletes only — the underlying file on disk is deliberately left in
 * place until the aggregate is actually purged (a future retention/
 * cleanup job's job per DATA:RETENTION, not this action's), so that
 * RestoreMediaAction can bring a deleted asset back with its file intact.
 */
final readonly class DeleteMediaAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(MediaAsset $asset, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($asset, $expectedVersion, $actorId) {
            $asset->assertVersionMatches($expectedVersion);

            $before = $asset->only(['filename', 'path']);
            $asset->delete();

            $this->auditLogger->log(
                action: 'media.deleted',
                actorId: $actorId,
                targetType: MediaAsset::class,
                targetId: $asset->id,
                before: $before,
            );

            $this->eventBus->publish(new MediaDeleted(mediaId: $asset->id));
        });
    }
}
