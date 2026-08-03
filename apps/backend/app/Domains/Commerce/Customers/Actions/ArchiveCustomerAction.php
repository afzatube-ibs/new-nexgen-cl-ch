<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Actions;

use App\Domains\Commerce\Customers\Audit\AuditLogger;
use App\Domains\Commerce\Customers\Models\Customer;
use Illuminate\Support\Facades\DB;

/**
 * Transitions a Customer to DATA:LIFECYCLE's Archived state — an
 * intentional, recorded action, distinct from deletion
 * (DeleteCustomerAction).
 */
final readonly class ArchiveCustomerAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Customer $customer, int $expectedVersion, ?string $actorId): Customer
    {
        return DB::transaction(function () use ($customer, $expectedVersion, $actorId) {
            $customer->assertVersionMatches($expectedVersion);

            $previousStatus = $customer->status;
            $customer->status = Customer::STATUS_ARCHIVED;
            $customer->save();

            $this->auditLogger->log(
                action: 'customer.archived',
                actorId: $actorId,
                targetType: Customer::class,
                targetId: $customer->id,
                before: ['status' => $previousStatus],
                after: ['status' => $customer->status],
            );

            return $customer;
        });
    }
}
