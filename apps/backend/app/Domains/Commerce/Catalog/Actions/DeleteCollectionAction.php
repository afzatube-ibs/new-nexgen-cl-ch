<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Exceptions\DependentRecordsExistException;
use App\Domains\Commerce\Catalog\Models\Collection;
use Illuminate\Support\Facades\DB;

final readonly class DeleteCollectionAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Collection $collection, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($collection, $expectedVersion, $actorId) {
            $collection->assertVersionMatches($expectedVersion);

            // Deleting a collection still assigned to a live product used
            // to silently detach it — never remove a product relationship
            // without the merchant explicitly acknowledging it first
            // (unassign it from those products, or archive this collection
            // instead). Found via a Product Owner acceptance audit of
            // Phase 2.2 (2026-08-11).
            $productCount = $collection->products()->count();
            if ($productCount > 0) {
                throw new DependentRecordsExistException(
                    Collection::class,
                    $collection->id,
                    "it is still assigned to {$productCount} product(s). Unassign it from those products (Organization tab), or archive this collection instead.",
                );
            }

            $before = $collection->only(['name', 'slug']);
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
