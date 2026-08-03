<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Actions;

use App\Domains\Commerce\Customers\Audit\AuditLogger;
use App\Domains\Commerce\Customers\Events\CustomerRegistered;
use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * Creates a new Customer account. Staff-initiated for Phase 1 — no
 * self-service registration endpoint exists yet, since that would need its
 * own authentication guard distinct from Identity & Access's staff
 * `auth:sanctum` usage (a customer's bearer token must never satisfy a
 * `permission:` check meant for staff), and nothing in this platform can
 * consume a customer-facing registration flow yet (no storefront; ADR-0006
 * storefront rendering remains Draft). This action, this module's
 * PermissionRegistry-gated HTTP surface, and the `CustomerRegistered`
 * event it publishes are unaffected by that future addition — only the
 * caller changes.
 */
final readonly class RegisterCustomerAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): Customer
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $customer = Customer::query()->create([
                'name' => $attributes['name'],
                'email' => $attributes['email'],
                'password' => $attributes['password'],
                'phone' => $attributes['phone'] ?? null,
            ]);

            $this->auditLogger->log(
                action: 'customer.registered',
                actorId: $actorId,
                targetType: Customer::class,
                targetId: $customer->id,
                after: ['name' => $customer->name, 'email' => $customer->email, 'phone' => $customer->phone],
            );

            $this->eventBus->publish(new CustomerRegistered(
                customerId: $customer->id,
                email: $customer->email,
            ));

            return $customer;
        });
    }
}
