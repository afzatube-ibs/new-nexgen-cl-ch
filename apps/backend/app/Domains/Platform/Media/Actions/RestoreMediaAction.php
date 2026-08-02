<?php

declare(strict_types=1);

namespace App\Domains\Platform\Media\Actions;

use App\Domains\Platform\Media\Audit\AuditLogger;
use App\Domains\Platform\Media\Models\MediaAsset;
use Illuminate\Support\Facades\DB;

final readonly class RestoreMediaAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(MediaAsset $asset, ?string $actorId): MediaAsset
    {
        return DB::transaction(function () use ($asset, $actorId) {
            $asset->restore();

            $this->auditLogger->log(
                action: 'media.restored',
                actorId: $actorId,
                targetType: MediaAsset::class,
                targetId: $asset->id,
                after: $asset->only(['filename']),
            );

            return $asset;
        });
    }
}
