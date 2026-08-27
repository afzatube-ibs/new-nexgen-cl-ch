<?php

declare(strict_types=1);

namespace App\Domains\Platform\Appearance\Actions;

use App\Domains\Platform\Appearance\Audit\AuditLogger;
use App\Domains\Platform\Appearance\Models\StoreAppearance;
use Illuminate\Support\Facades\DB;

/**
 * Saves a real, honest draft — mirrors `StoreConfiguration\Actions\
 * UpdateStoreAction`'s own real before/after audit-diff pattern. This is
 * `APPEARANCE_WORKSPACE_SPECIFICATION.md` §3's own "Save" action: it never
 * touches `published_snapshot`, so nothing a real customer sees on the
 * live Storefront changes until `PublishStoreAppearanceAction` runs
 * separately — the same draft/published split that document's §10
 * specifies.
 */
final readonly class UpdateStoreAppearanceAction
{
    public function __construct(
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(StoreAppearance $appearance, array $changes, int $expectedVersion, ?string $actorId): StoreAppearance
    {
        return DB::transaction(function () use ($appearance, $changes, $expectedVersion, $actorId) {
            $appearance->assertVersionMatches($expectedVersion);

            $before = $appearance->only(StoreAppearance::TRACKED_FIELDS);

            $appearance->fill($changes)->save();

            $after = $appearance->only(StoreAppearance::TRACKED_FIELDS);

            $this->auditLogger->log(
                action: 'store_appearance.updated',
                actorId: $actorId,
                targetType: StoreAppearance::class,
                targetId: $appearance->id,
                before: $before,
                after: $after,
            );

            return $appearance;
        });
    }
}
