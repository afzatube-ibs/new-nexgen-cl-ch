<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Console\Commands;

use Database\Seeders\PermissionSeeder;
use Illuminate\Console\Command;

/**
 * The operator-facing entry point to PermissionSeeder's idempotent upsert —
 * for running against an already-installed platform (e.g. after a
 * deployment introduces a new permission), where re-running `db:seed`
 * would be the wrong tool since that command's other seeders are not
 * necessarily safe to re-run. See PermissionSeeder's docblock for why this
 * upsert-by-key is safe to run repeatedly, and PermissionRegistry's for why
 * it is never destructive of a permission no longer declared in code.
 */
final class SyncPermissionsCommand extends Command
{
    protected $signature = 'identity-access:sync-permissions';

    protected $description = 'Sync the code-defined permission registry into the database.';

    public function handle(): int
    {
        (new PermissionSeeder)->run();

        $this->info('Permissions synced.');

        return self::SUCCESS;
    }
}
