<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Console\Commands;

use Database\Seeders\LocalizationPermissionSeeder;
use Illuminate\Console\Command;

/**
 * The operator-facing entry point to LocalizationPermissionSeeder's
 * idempotent upsert — mirrors Identity & Access's identity-access:sync-
 * permissions command (see that class's docblock) for the same reason: an
 * already-installed platform needs a way to pick up a newly-introduced
 * permission without re-running the full `db:seed`.
 */
final class SyncPermissionsCommand extends Command
{
    protected $signature = 'localization:sync-permissions';

    protected $description = "Sync Localization & Currency's code-defined permission registry into the database.";

    public function handle(): int
    {
        (new LocalizationPermissionSeeder)->run();

        $this->info('Permissions synced.');

        return self::SUCCESS;
    }
}
