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
 * Updates one address in a Customer's book. Enforces the same
 * single-default-per-type invariant as AddCustomerAddressAction — see that
 * class's docblock.
 */
final readonly class UpdateCustomerAddressAction
{
    private const array TRACKED_FIELDS = [
        'label', 'recipient_name', 'phone', 'address_line1', 'address_line2',
        'city', 'region', 'postal_code', 'country_code', 'is_default_shipping', 'is_default_billing',
    ];

    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(Customer $customer, CustomerAddress $address, array $changes, int $expectedVersion, ?string $actorId): CustomerAddress
    {
        return DB::transaction(function () use ($customer, $address, $changes, $expectedVersion, $actorId) {
            $customer->assertVersionMatches($expectedVersion);

            if (($changes['is_default_shipping'] ?? false) === true) {
                $customer->addresses()->where('id', '!=', $address->id)->update(['is_default_shipping' => false]);
            }

            if (($changes['is_default_billing'] ?? false) === true) {
                $customer->addresses()->where('id', '!=', $address->id)->update(['is_default_billing' => false]);
            }

            $before = $address->only(self::TRACKED_FIELDS);
            $address->fill($changes)->save();

            $customer->touchAggregateVersion();

            $this->auditLogger->log(
                action: 'customer.address_updated',
                actorId: $actorId,
                targetType: CustomerAddress::class,
                targetId: $address->id,
                before: $before,
                after: $address->only(self::TRACKED_FIELDS),
            );

            $this->eventBus->publish(new CustomerProfileUpdated(customerId: $customer->id));

            return $address;
        });
    }
}
