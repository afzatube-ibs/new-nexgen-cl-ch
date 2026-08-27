<?php

declare(strict_types=1);

namespace App\Domains\Platform\Appearance\Actions;

use App\Domains\Platform\Appearance\Audit\AuditLogger;
use App\Domains\Platform\Appearance\Models\StoreAppearance;
use Illuminate\Support\Facades\DB;

/**
 * `APPEARANCE_WORKSPACE_SPECIFICATION.md` §10's own Publish flow, the
 * lightweight version this Pack builds (a full `theme_versions` history
 * table is a later Pack, per that document's own §14 roadmap): copies the
 * current draft's tracked fields into `published_snapshot` — a full copy,
 * never a diff, so this row's own `published_snapshot` is always a real,
 * complete, restorable record of what went live and when. This is the one
 * write the real Storefront's own eventual branding read is meant to
 * consume, never the live draft columns directly, so an in-progress edit
 * is never visible to a real customer mid-save.
 */
final readonly class PublishStoreAppearanceAction
{
    public function __construct(
        private AuditLogger $auditLogger,
    ) {}

    public function execute(StoreAppearance $appearance, int $expectedVersion, ?string $actorId): StoreAppearance
    {
        return DB::transaction(function () use ($appearance, $expectedVersion, $actorId) {
            $appearance->assertVersionMatches($expectedVersion);

            $snapshot = $appearance->only(StoreAppearance::TRACKED_FIELDS);

            $appearance->published_snapshot = $snapshot;
            $appearance->published_at = now();
            $appearance->published_by = $actorId;
            $appearance->save();

            $this->auditLogger->log(
                action: 'store_appearance.published',
                actorId: $actorId,
                targetType: StoreAppearance::class,
                targetId: $appearance->id,
                after: $snapshot,
            );

            return $appearance;
        });
    }
}
