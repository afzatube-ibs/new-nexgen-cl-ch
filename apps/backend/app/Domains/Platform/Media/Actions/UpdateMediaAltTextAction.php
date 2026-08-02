<?php

declare(strict_types=1);

namespace App\Domains\Platform\Media\Actions;

use App\Domains\Platform\Media\Audit\AuditLogger;
use App\Domains\Platform\Media\Models\MediaAsset;
use Illuminate\Support\Facades\DB;

final readonly class UpdateMediaAltTextAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(MediaAsset $asset, ?string $altText, int $expectedVersion, ?string $actorId): MediaAsset
    {
        return DB::transaction(function () use ($asset, $altText, $expectedVersion, $actorId) {
            $asset->assertVersionMatches($expectedVersion);

            $before = ['alt_text' => $asset->alt_text];
            $asset->alt_text = $altText;
            $asset->save();

            $this->auditLogger->log(
                action: 'media.alt_text_updated',
                actorId: $actorId,
                targetType: MediaAsset::class,
                targetId: $asset->id,
                before: $before,
                after: ['alt_text' => $asset->alt_text],
            );

            return $asset;
        });
    }
}
