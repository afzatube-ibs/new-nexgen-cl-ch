<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Actions;

use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use App\Domains\Platform\IdentityAccess\Audit\AuditLogger;
use App\Domains\Platform\IdentityAccess\Events\UserRegistered;
use App\Domains\Platform\IdentityAccess\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Creates a new staff/operator account. Per DATA:TRANSACTION_BOUNDARIES,
 * the write is confined to the User aggregate itself — the audit record
 * and event publish happen inside the same transaction as the insert so a
 * user is never created without a corresponding audit trail entry, but
 * publishing itself is a transport concern, not a second aggregate write.
 */
final readonly class RegisterUserAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(string $name, string $email, string $password, ?string $actorId): User
    {
        return DB::transaction(function () use ($name, $email, $password, $actorId) {
            $user = User::query()->create([
                'name' => $name,
                'email' => $email,
                'password' => $password,
            ]);

            $this->auditLogger->log(
                action: 'user.registered',
                actorId: $actorId,
                targetType: User::class,
                targetId: $user->id,
                after: ['name' => $user->name, 'email' => $user->email],
            );

            $this->eventBus->publish(new UserRegistered($user->id, $user->email));

            return $user;
        });
    }
}
