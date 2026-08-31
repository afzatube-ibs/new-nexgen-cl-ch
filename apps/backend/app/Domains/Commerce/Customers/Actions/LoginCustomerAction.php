<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Actions;

use App\Domains\Commerce\Customers\Audit\AuditLogger;
use App\Domains\Commerce\Customers\Events\CustomerAuthenticated;
use App\Domains\Commerce\Customers\Events\CustomerAuthenticationFailed;
use App\Domains\Commerce\Customers\Exceptions\AuthenticationFailedException;
use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\NewAccessToken;

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts). Mirrors
 * Identity & Access's own `AuthenticateUserAction` exactly — the identical
 * verification discipline applies to any real credential check on this
 * platform, staff or customer: every failure path (unknown email, wrong
 * password, archived account) is deliberately indistinguishable to the
 * caller, so a caller can never use this endpoint to enumerate which
 * emails have real accounts.
 */
final readonly class LoginCustomerAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * Phase 4.0 Slice 4.1 (Mobile-First Customer Identity) — `$identifier`
     * may be either a phone or an email; looked up against both columns
     * rather than requiring the caller to say which, matching the
     * Storefront's own single "phone or email" login field. No
     * normalization (e.g. stripping a country-code prefix) is applied —
     * an exact match against whichever value the customer registered
     * with, the same discipline `email` lookups have always used here.
     *
     * @return array{customer: Customer, token: NewAccessToken}
     */
    public function execute(string $identifier, string $password, string $deviceName): array
    {
        $customer = Customer::query()
            ->where('email', $identifier)
            ->orWhere('phone', $identifier)
            ->first();

        if ($customer === null || ! Hash::check($password, $customer->password)) {
            $this->fail($identifier, 'invalid_credentials');
        }

        if (! $customer->isActive()) {
            $this->fail($identifier, 'account_not_active');
        }

        $token = $customer->createToken($deviceName);

        $this->auditLogger->log(
            action: 'customer.authenticated',
            actorId: $customer->id,
            targetType: Customer::class,
            targetId: $customer->id,
        );

        $this->eventBus->publish(new CustomerAuthenticated($customer->id));

        return ['customer' => $customer, 'token' => $token];
    }

    private function fail(string $attemptedIdentifier, string $reason): never
    {
        $this->auditLogger->log(
            action: 'customer.authentication_failed',
            actorId: null,
            targetType: 'attempted_identifier',
            targetId: $attemptedIdentifier,
        );

        $this->eventBus->publish(new CustomerAuthenticationFailed($attemptedIdentifier, $reason));

        throw new AuthenticationFailedException;
    }
}
