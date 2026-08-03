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
 * Removes one address from a Customer's book. No replacement default is
 * forced — unlike Localization & Currency's mandatory default locale/
 * currency, nothing else on this platform requires a customer to always
 * have a default shipping or billing address; a customer may simply have
 * none until they add or designate one.
 */
final readonly class DeleteCustomerAddressAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(Customer $customer, CustomerAddress $address, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($customer, $address, $expectedVersion, $actorId) {
            $customer->assertVersionMatches($expectedVersion);

            $before = $address->only(['label', 'address_line1', 'city', 'country_code']);
            $address->delete();

            $customer->touchAggregateVersion();

            $this->auditLogger->log(
                action: 'customer.address_deleted',
                actorId: $actorId,
                targetType: CustomerAddress::class,
                targetId: $address->id,
                before: $before,
            );

            $this->eventBus->publish(new CustomerProfileUpdated(customerId: $customer->id));
        });
    }
}
