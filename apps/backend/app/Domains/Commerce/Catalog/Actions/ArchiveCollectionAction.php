<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Collection;
use Illuminate\Support\Facades\DB;

final readonly class ArchiveCollectionAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Collection $collection, int $expectedVersion, ?string $actorId): Collection
    {
        return DB::transaction(function () use ($collection, $expectedVersion, $actorId) {
            $collection->assertVersionMatches($expectedVersion);

            $before = ['status' => $collection->status];
            $collection->status = Collection::STATUS_ARCHIVED;
            $collection->save();

            $this->auditLogger->log(
                action: 'collection.archived',
                actorId: $actorId,
                targetType: Collection::class,
                targetId: $collection->id,
                before: $before,
                after: ['status' => $collection->status],
            );

            return $collection;
        });
    }
}
