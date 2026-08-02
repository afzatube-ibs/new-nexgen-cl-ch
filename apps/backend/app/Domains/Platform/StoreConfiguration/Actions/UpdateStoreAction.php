<?php

declare(strict_types=1);

namespace App\Domains\Platform\StoreConfiguration\Actions;

use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use App\Domains\Platform\StoreConfiguration\Audit\AuditLogger;
use App\Domains\Platform\StoreConfiguration\Events\StoreConfigurationChanged;
use App\Domains\Platform\StoreConfiguration\Models\Store;
use Illuminate\Support\Facades\DB;

final readonly class UpdateStoreAction
{
    private const array TRACKED_FIELDS = [
        'name', 'legal_name', 'currency_code', 'locale', 'timezone',
        'contact_email', 'contact_phone', 'address_line1', 'address_line2',
        'city', 'region', 'postal_code', 'country_code',
    ];

    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(Store $store, array $changes, int $expectedVersion, ?string $actorId): Store
    {
        return DB::transaction(function () use ($store, $changes, $expectedVersion, $actorId) {
            $store->assertVersionMatches($expectedVersion);

            $before = $store->only(self::TRACKED_FIELDS);

            $store->fill($changes)->save();

            $after = $store->only(self::TRACKED_FIELDS);

            $this->auditLogger->log(
                action: 'store.updated',
                actorId: $actorId,
                targetType: Store::class,
                targetId: $store->id,
                before: $before,
                after: $after,
            );

            $this->eventBus->publish(new StoreConfigurationChanged(
                storeId: $store->id,
                currencyCode: $store->currency_code,
                locale: $store->locale,
                timezone: $store->timezone,
            ));

            return $store;
        });
    }
}
