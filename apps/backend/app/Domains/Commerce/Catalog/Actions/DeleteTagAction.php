<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Tag;
use Illuminate\Support\Facades\DB;

final readonly class DeleteTagAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Tag $tag, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($tag, $expectedVersion, $actorId) {
            $tag->assertVersionMatches($expectedVersion);

            $affectedProductIds = $tag->products()->pluck('products.id')->all();
            $tag->products()->detach();

            $before = $tag->only(['name', 'slug']) + ['affected_product_ids' => $affectedProductIds];
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
