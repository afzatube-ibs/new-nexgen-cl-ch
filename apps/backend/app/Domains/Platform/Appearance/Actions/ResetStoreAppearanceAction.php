<?php

declare(strict_types=1);

namespace App\Domains\Platform\Appearance\Actions;

use App\Domains\Platform\Appearance\Audit\AuditLogger;
use App\Domains\Platform\Appearance\Models\StoreAppearance;
use Illuminate\Support\Facades\DB;

/**
 * `APPEARANCE_WORKSPACE_SPECIFICATION.md` §3's own "Reset" action: discards
 * the current draft by restoring every tracked field from the last real
 * `published_snapshot` — never a silent no-op, and never a delete. If the
 * store has never published anything, there is nothing real to reset to,
 * so this throws rather than fabricating a "restored" state that never
 * really existed.
 */
final readonly class ResetStoreAppearanceAction
{
    public function __construct(
        private AuditLogger $auditLogger,
    ) {}

    public function execute(StoreAppearance $appearance, int $expectedVersion, ?string $actorId): StoreAppearance
    {
        return DB::transaction(function () use ($appearance, $expectedVersion, $actorId) {
            $appearance->assertVersionMatches($expectedVersion);

            if ($appearance->published_snapshot === null) {
                throw new \RuntimeException('This store has never been published — there is no published version to reset to.');
            }

            $before = $appearance->only(StoreAppearance::TRACKED_FIELDS);

            $appearance->fill($appearance->published_snapshot)->save();

            $this->auditLogger->log(
                action: 'store_appearance.reset',
                actorId: $actorId,
                targetType: StoreAppearance::class,
                targetId: $appearance->id,
                before: $before,
                after: $appearance->only(StoreAppearance::TRACKED_FIELDS),
            );

            return $appearance;
        });
    }
}
