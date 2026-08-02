<?php

declare(strict_types=1);

namespace App\Domains\Platform\StoreConfiguration\Console\Commands;

use Database\Seeders\StoreConfigurationPermissionSeeder;
use Illuminate\Console\Command;

/**
 * The operator-facing entry point to StoreConfigurationPermissionSeeder's
 * idempotent upsert — mirrors Identity & Access's identity-access:sync-
 * permissions command (see that class's docblock) for the same reason: an
 * already-installed platform needs a way to pick up a newly-introduced
 * permission without re-running the full `db:seed`.
 */
final class SyncPermissionsCommand extends Command
{
    protected $signature = 'store-configuration:sync-permissions';

    protected $description = "Sync Store Configuration's code-defined permission registry into the database.";

    public function handle(): int
    {
        (new StoreConfigurationPermissionSeeder)->run();

        $this->info('Permissions synced.');

        return self::SUCCESS;
    }
}
