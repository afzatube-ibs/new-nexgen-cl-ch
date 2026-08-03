<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Actions;

use App\Domains\Commerce\Customers\Audit\AuditLogger;
use App\Domains\Commerce\Customers\Events\CustomerProfileUpdated;
use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

final readonly class UpdateCustomerProfileAction
{
    private const array TRACKED_FIELDS = ['name', 'email', 'phone'];

    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(Customer $customer, array $changes, int $expectedVersion, ?string $actorId): Customer
    {
        return DB::transaction(function () use ($customer, $changes, $expectedVersion, $actorId) {
            $customer->assertVersionMatches($expectedVersion);

            $before = $customer->only(self::TRACKED_FIELDS);
            $customer->fill($changes)->save();

            $this->auditLogger->log(
                action: 'customer.profile_updated',
                actorId: $actorId,
                targetType: Customer::class,
                targetId: $customer->id,
                before: $before,
                after: $customer->only(self::TRACKED_FIELDS),
            );

            $this->eventBus->publish(new CustomerProfileUpdated(customerId: $customer->id));

            return $customer;
        });
    }
}
