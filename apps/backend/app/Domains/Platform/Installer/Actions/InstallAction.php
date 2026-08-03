<?php

declare(strict_types=1);

namespace App\Domains\Platform\Installer\Actions;

use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use App\Domains\Platform\IdentityAccess\Actions\AssignRoleAction;
use App\Domains\Platform\IdentityAccess\Actions\RegisterUserAction;
use App\Domains\Platform\IdentityAccess\Models\Role;
use App\Domains\Platform\Installer\Events\PlatformInstalled;
use App\Domains\Platform\Installer\Exceptions\AdministratorRoleMissingException;
use App\Domains\Platform\Installer\Exceptions\AlreadyInstalledException;
use App\Domains\Platform\Installer\Models\Installation;
use App\Domains\Platform\StoreConfiguration\Actions\CreateStoreAction;
use Illuminate\Database\UniqueConstraintViolationException;

/**
 * Orchestrates first-run installation: creates the platform's first
 * administrator (Identity & Access) and its first store (Store
 * Configuration), then records completion.
 *
 * Deliberately NOT one shared database transaction across these writes —
 * DATA:TRANSACTION_BOUNDARIES is explicit that "a transaction never spans
 * more than one aggregate," and administrator-user, role-assignment, store,
 * and installation-record are four separate aggregates in two other
 * modules plus this one. Each called action already commits its own
 * single-aggregate transaction; this method is a sequence of steps
 * connected by successful completion, exactly the alternative
 * DATA:TRANSACTION_BOUNDARIES itself prescribes ("the operation should be
 * reconsidered as two separate steps connected by an event rather than one
 * atomic change").
 *
 * Accepted, documented limitation: because these are separate steps rather
 * than one atomic unit, a failure between them (e.g. store creation
 * failing after the administrator account was already created) leaves a
 * real account behind without a completed installation record, and two
 * near-simultaneous install attempts could both pass the initial
 * not-yet-installed check before either finishes. This module's
 * first-run, single-operator, run-at-most-once-in-a-platform's-lifetime
 * nature makes that an acceptable, low-severity tradeoff rather than
 * justification for distributed-transaction complexity this platform's
 * architecture otherwise deliberately avoids. The final completion write
 * is still guarded by a database-level unique constraint (see the
 * platform_installations migration), so true double-installation can
 * never silently succeed twice even under a race.
 */
final readonly class InstallAction
{
    public function __construct(
        private RegisterUserAction $registerUserAction,
        private AssignRoleAction $assignRoleAction,
        private CreateStoreAction $createStoreAction,
        private DomainEventBus $eventBus,
    ) {}

    /**
     * @param  array{name: string, email: string, password: string}  $administrator
     * @param  array<string, mixed>  $store
     */
    public function execute(array $administrator, array $store): Installation
    {
        if (Installation::query()->exists()) {
            throw new AlreadyInstalledException;
        }

        $role = Role::query()->where('name', 'administrator')->first();

        if ($role === null) {
            throw new AdministratorRoleMissingException;
        }

        $user = $this->registerUserAction->execute(
            $administrator['name'],
            $administrator['email'],
            $administrator['password'],
            actorId: null,
        );

        $this->assignRoleAction->execute($user, $role, actorId: null);

        $createdStore = $this->createStoreAction->execute($store, actorId: $user->id);

        try {
            $installation = Installation::query()->create(['installed_by' => $user->id]);
        } catch (UniqueConstraintViolationException) {
            throw new AlreadyInstalledException;
        }

        $this->eventBus->publish(new PlatformInstalled(
            installationId: $installation->id,
            administratorUserId: $user->id,
            storeId: $createdStore->id,
        ));

        return $installation;
    }
}
