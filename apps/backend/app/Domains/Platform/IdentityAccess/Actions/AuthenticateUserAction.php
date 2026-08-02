<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Actions;

use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use App\Domains\Platform\IdentityAccess\Audit\AuditLogger;
use App\Domains\Platform\IdentityAccess\Events\UserAuthenticated;
use App\Domains\Platform\IdentityAccess\Events\UserAuthenticationFailed;
use App\Domains\Platform\IdentityAccess\Exceptions\AuthenticationFailedException;
use App\Domains\Platform\IdentityAccess\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\NewAccessToken;

/**
 * SECURITY:AUTHENTICATION's single verification point: "a caller's claimed
 * identity must be verified through a mechanism resistant to guessing,
 * replay, and interception, and a failed authentication attempt is itself
 * a security-relevant, audited event." Every failure path — unknown email,
 * wrong password, archived account — is deliberately indistinguishable to
 * the caller (the same generic message and audited reason internally),
 * so a caller can never use this endpoint to enumerate which emails have
 * accounts, per SECURITY:AUTHORIZATION's "never in a way that would leak
 * information the caller isn't entitled to" applied to authentication.
 */
final readonly class AuthenticateUserAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @return array{user: User, token: NewAccessToken}
     */
    public function execute(string $email, string $password, string $deviceName): array
    {
        $user = User::query()->where('email', $email)->first();

        if ($user === null || ! Hash::check($password, $user->password)) {
            $this->fail($email, 'invalid_credentials');
        }

        if (! $user->isActive()) {
            $this->fail($email, 'account_not_active');
        }

        $token = $user->createToken($deviceName);

        $this->auditLogger->log(
            action: 'user.authenticated',
            actorId: $user->id,
            targetType: User::class,
            targetId: $user->id,
        );

        $this->eventBus->publish(new UserAuthenticated($user->id));

        return ['user' => $user, 'token' => $token];
    }

    private function fail(string $attemptedEmail, string $reason): never
    {
        $this->auditLogger->log(
            action: 'user.authentication_failed',
            actorId: null,
            targetType: 'attempted_email',
            targetId: $attemptedEmail,
        );

        $this->eventBus->publish(new UserAuthenticationFailed($attemptedEmail, $reason));

        throw new AuthenticationFailedException;
    }
}
