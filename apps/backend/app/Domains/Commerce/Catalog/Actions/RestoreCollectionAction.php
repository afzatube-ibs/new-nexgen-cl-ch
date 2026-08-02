<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Collection;
use Illuminate\Support\Facades\DB;

final readonly class RestoreCollectionAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Collection $collection, ?string $actorId): Collection
    {
        return DB::transaction(function () use ($collection, $actorId) {
            $collection->restore();

            $this->auditLogger->log(
                action: 'collection.restored',
                actorId: $actorId,
                targetType: Collection::class,
                targetId: $collection->id,
                after: $collection->only(['name', 'slug']),
            );

            return $collection;
        });
    }
}
