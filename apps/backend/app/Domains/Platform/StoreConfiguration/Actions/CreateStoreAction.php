<?php

declare(strict_types=1);

namespace App\Domains\Platform\StoreConfiguration\Actions;

use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use App\Domains\Platform\StoreConfiguration\Audit\AuditLogger;
use App\Domains\Platform\StoreConfiguration\Events\StoreConfigurationChanged;
use App\Domains\Platform\StoreConfiguration\Models\Store;
use Illuminate\Support\Facades\DB;

final readonly class CreateStoreAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): Store
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $store = Store::query()->create($attributes);

            $this->auditLogger->log(
                action: 'store.created',
                actorId: $actorId,
                targetType: Store::class,
                targetId: $store->id,
                after: $store->only([
                    'name', 'legal_name', 'currency_code', 'locale', 'timezone',
                    'contact_email', 'contact_phone', 'address_line1', 'address_line2',
                    'city', 'region', 'postal_code', 'country_code', 'status',
                ]),
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
