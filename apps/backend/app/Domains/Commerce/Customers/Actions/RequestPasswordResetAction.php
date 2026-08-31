<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Actions;

use App\Domains\Commerce\Customers\Audit\AuditLogger;
use App\Domains\Commerce\Customers\Events\CustomerPasswordResetRequested;
use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Commerce\Customers\Models\CustomerPasswordResetToken;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Production Completion Plan v2, Milestone 5b (Password Reset). Mirrors
 * Laravel's own stock `DatabaseTokenRepository` shape (email-keyed,
 * stores a hash, one row per email — a second request for the same email
 * replaces the first, invalidating it) while staying this platform's own
 * real, explicit Action rather than the framework's password-broker
 * facade, matching every other credential-issuing Action on this
 * platform (`LoginCustomerAction`, `identity-access:create-service-
 * account`).
 *
 * SECURITY:AUTHORIZATION's "never leak information the caller isn't
 * entitled to" applies here exactly as it does to login: whether a given
 * email has a real account is itself sensitive. A request for an unknown
 * email is a genuine, silent no-op — no token, no email, no audit entry
 * naming a nonexistent account — and the caller-facing outcome (a real
 * `CustomerPasswordResetController` always answers with the identical
 * "if that email has an account, a reset link was sent") is indistinguishable
 * either way.
 */
final readonly class RequestPasswordResetAction
{
    public const int TOKEN_LIFETIME_MINUTES = 60;

    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(string $email): void
    {
        $customer = Customer::query()->where('email', $email)->first();

        if ($customer === null || ! $customer->isActive()) {
            return;
        }

        $plainTextToken = Str::random(64);

        CustomerPasswordResetToken::query()->updateOrCreate(
            ['email' => $customer->email],
            ['token' => Hash::make($plainTextToken), 'created_at' => now()],
        );

        $this->auditLogger->log(
            action: 'customer.password_reset_requested',
            actorId: $customer->id,
            targetType: Customer::class,
            targetId: $customer->id,
        );

        $this->eventBus->publish(new CustomerPasswordResetRequested(
            customerId: $customer->id,
            // `$email`, not `$customer->email` — genuinely the identical
            // value here (the query above only ever matches a row whose
            // `email` column equals this real, non-null string), but
            // `Customer::$email` widened to `?string` under Phase 4.0
            // Slice 4.1 (Mobile-First Customer Identity); `$email` keeps
            // this call statically well-typed without an unsafe cast.
            email: $email,
            plainTextToken: $plainTextToken,
        ));
    }
}
