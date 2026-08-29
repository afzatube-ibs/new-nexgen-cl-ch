<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Actions;

use App\Domains\Commerce\Customers\Audit\AuditLogger;
use App\Domains\Commerce\Customers\Events\CustomerPasswordWasReset;
use App\Domains\Commerce\Customers\Exceptions\PasswordResetFailedException;
use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Commerce\Customers\Models\CustomerPasswordResetToken;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Production Completion Plan v2, Milestone 5b (Password Reset). Verifies
 * the real, plaintext token a customer received by email against the
 * stored hash (`Hash::check`, identical discipline to how a login
 * password itself is checked) and this class's own
 * `RequestPasswordResetAction::TOKEN_LIFETIME_MINUTES` window — an
 * unknown email, a wrong token, and an expired token all throw the
 * identical `PasswordResetFailedException`, for the same anti-
 * enumeration reason `LoginCustomerAction` never distinguishes its own
 * failure reasons to the caller.
 *
 * Revokes every one of the customer's existing Sanctum tokens on a
 * successful reset — a real security baseline (a session started before
 * a password reset, e.g. by someone who no longer should have access,
 * must not silently survive it) this platform's own staff-side
 * `ArchiveUserCommand`-equivalent already applies for an archived
 * account.
 */
final readonly class ResetPasswordAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(string $email, string $plainTextToken, string $newPassword): void
    {
        $record = CustomerPasswordResetToken::query()->where('email', $email)->first();

        if ($record === null || ! Hash::check($plainTextToken, $record->token)) {
            throw new PasswordResetFailedException;
        }

        if ($record->created_at === null || $record->created_at->addMinutes(RequestPasswordResetAction::TOKEN_LIFETIME_MINUTES)->isPast()) {
            $record->delete();
            throw new PasswordResetFailedException;
        }

        $customer = Customer::query()->where('email', $email)->first();

        if ($customer === null) {
            $record->delete();
            throw new PasswordResetFailedException;
        }

        DB::transaction(function () use ($customer, $newPassword, $record): void {
            $customer->password = $newPassword;
            $customer->save();

            $customer->tokens()->delete();
            $record->delete();

            $this->auditLogger->log(
                action: 'customer.password_was_reset',
                actorId: $customer->id,
                targetType: Customer::class,
                targetId: $customer->id,
            );

            $this->eventBus->publish(new CustomerPasswordWasReset(customerId: $customer->id));
        });
    }
}
