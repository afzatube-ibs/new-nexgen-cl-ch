<?php

declare(strict_types=1);

namespace App\Domains\Platform\StoreConfiguration\Actions;

use App\Domains\Platform\StoreConfiguration\Audit\AuditLogger;
use App\Domains\Platform\StoreConfiguration\Models\Store;
use Illuminate\Support\Facades\DB;

final readonly class DeleteStoreAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Store $store, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($store, $expectedVersion, $actorId) {
            $store->assertVersionMatches($expectedVersion);

            $before = $store->only(['name', 'currency_code', 'locale']);
            $store->delete();

            $this->auditLogger->log(
                action: 'store.deleted',
                actorId: $actorId,
                targetType: Store::class,
                targetId: $store->id,
                before: $before,
            );
        });
    }
}
