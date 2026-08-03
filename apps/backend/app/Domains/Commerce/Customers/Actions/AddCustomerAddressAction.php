<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Actions;

use App\Domains\Commerce\Customers\Audit\AuditLogger;
use App\Domains\Commerce\Customers\Events\CustomerProfileUpdated;
use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Commerce\Customers\Models\CustomerAddress;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * Adds an address to a Customer's book. Enforces the single-default-per-
 * type invariant: if `is_default_shipping` or `is_default_billing` is
 * true, every sibling address of that type is cleared first, in the same
 * transaction. Requires the customer's current `expected_version` — see
 * the customer_addresses migration's docblock for why address mutations
 * version the aggregate root rather than the address row itself.
 */
final readonly class AddCustomerAddressAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(Customer $customer, array $attributes, int $expectedVersion, ?string $actorId): CustomerAddress
    {
        return DB::transaction(function () use ($customer, $attributes, $expectedVersion, $actorId) {
            $customer->assertVersionMatches($expectedVersion);

            if (($attributes['is_default_shipping'] ?? false) === true) {
                $customer->addresses()->update(['is_default_shipping' => false]);
            }

            if (($attributes['is_default_billing'] ?? false) === true) {
                $customer->addresses()->update(['is_default_billing' => false]);
            }

            $address = $customer->addresses()->create([
                'label' => $attributes['label'] ?? null,
                'recipient_name' => $attributes['recipient_name'],
                'phone' => $attributes['phone'] ?? null,
                'address_line1' => $attributes['address_line1'],
                'address_line2' => $attributes['address_line2'] ?? null,
                'city' => $attributes['city'],
                'region' => $attributes['region'] ?? null,
                'postal_code' => $attributes['postal_code'] ?? null,
                'country_code' => $attributes['country_code'],
                'is_default_shipping' => $attributes['is_default_shipping'] ?? false,
                'is_default_billing' => $attributes['is_default_billing'] ?? false,
            ]);

            $customer->touchAggregateVersion();

            $this->auditLogger->log(
                action: 'customer.address_added',
                actorId: $actorId,
                targetType: CustomerAddress::class,
                targetId: $address->id,
                after: $address->only([
                    'customer_id', 'label', 'recipient_name', 'address_line1', 'address_line2',
                    'city', 'region', 'postal_code', 'country_code', 'is_default_shipping', 'is_default_billing',
                ]),
            );

            $this->eventBus->publish(new CustomerProfileUpdated(customerId: $customer->id));

            return $address;
        });
    }
}
