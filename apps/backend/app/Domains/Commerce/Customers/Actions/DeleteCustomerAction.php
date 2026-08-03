<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Actions;

use App\Domains\Commerce\Customers\Audit\AuditLogger;
use App\Domains\Commerce\Customers\Models\Customer;
use Illuminate\Support\Facades\DB;

/**
 * Soft-deletes a Customer — DATA:LIFECYCLE's Deleted state. Also
 * soft-deletes every address in its book: Customer and its addresses are
 * one aggregate (see the customer_addresses migration's docblock), so the
 * whole aggregate moves to Deleted together rather than leaving orphaned
 * address rows that outlive their owning Customer's own lifecycle state.
 */
final readonly class DeleteCustomerAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Customer $customer, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($customer, $expectedVersion, $actorId) {
            $customer->assertVersionMatches($expectedVersion);

            $before = $customer->only(['name', 'email']);
            $customer->addresses()->delete();
            $customer->delete();

            $this->auditLogger->log(
                action: 'customer.deleted',
                actorId: $actorId,
                targetType: Customer::class,
                targetId: $customer->id,
                before: $before,
            );
        });
    }
}
