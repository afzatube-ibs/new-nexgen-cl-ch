<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Exceptions\DependentRecordsExistException;
use App\Domains\Commerce\Catalog\Models\Tag;
use Illuminate\Support\Facades\DB;

final readonly class DeleteTagAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Tag $tag, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($tag, $expectedVersion, $actorId) {
            $tag->assertVersionMatches($expectedVersion);

            // Deleting a tag still assigned to a live product used to
            // silently detach it — never remove a product relationship
            // without the merchant explicitly acknowledging it first. Tag
            // has no `status` column (no Archive action exists for it, per
            // this module's own established scope), so the only way to
            // resolve this is to untag the affected products first. Found
            // via a Product Owner acceptance audit of Phase 2.2
            // (2026-08-11).
            $productCount = $tag->products()->count();
            if ($productCount > 0) {
                throw new DependentRecordsExistException(
                    Tag::class,
                    $tag->id,
                    "it is still assigned to {$productCount} product(s). Untag those products first (Organization tab), then delete this tag.",
                );
            }

            $before = $tag->only(['name', 'slug']);
            $tag->delete();

            $this->auditLogger->log(
                action: 'tag.deleted',
                actorId: $actorId,
                targetType: Tag::class,
                targetId: $tag->id,
                before: $before,
            );
        });
    }
}
