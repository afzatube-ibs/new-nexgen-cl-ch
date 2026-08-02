<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Collection;
use Illuminate\Support\Facades\DB;

final readonly class DeleteCollectionAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Collection $collection, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($collection, $expectedVersion, $actorId) {
            $collection->assertVersionMatches($expectedVersion);

            $affectedProductIds = $collection->products()->pluck('products.id')->all();
            $collection->products()->detach();

            $before = $collection->only(['name', 'slug']) + ['affected_product_ids' => $affectedProductIds];
            $collection->delete();

            $this->auditLogger->log(
                action: 'collection.deleted',
                actorId: $actorId,
                targetType: Collection::class,
                targetId: $collection->id,
                before: $before,
            );
        });
    }
}
