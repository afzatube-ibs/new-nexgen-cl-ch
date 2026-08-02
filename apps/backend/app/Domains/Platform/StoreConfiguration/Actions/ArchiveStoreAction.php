<?php

declare(strict_types=1);

namespace App\Domains\Platform\StoreConfiguration\Actions;

use App\Domains\Platform\StoreConfiguration\Audit\AuditLogger;
use App\Domains\Platform\StoreConfiguration\Models\Store;
use Illuminate\Support\Facades\DB;

final readonly class ArchiveStoreAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Store $store, int $expectedVersion, ?string $actorId): Store
    {
        return DB::transaction(function () use ($store, $expectedVersion, $actorId) {
            $store->assertVersionMatches($expectedVersion);

            $before = ['status' => $store->status];
            $store->status = Store::STATUS_ARCHIVED;
            $store->save();

            $this->auditLogger->log(
                action: 'store.archived',
                actorId: $actorId,
                targetType: Store::class,
                targetId: $store->id,
                before: $before,
                after: ['status' => $store->status],
            );

            return $store;
        });
    }
}
