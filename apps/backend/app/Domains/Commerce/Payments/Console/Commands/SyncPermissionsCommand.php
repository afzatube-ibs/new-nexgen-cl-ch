<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Console\Commands;

use Database\Seeders\PaymentsPermissionSeeder;
use Illuminate\Console\Command;

/**
 * The operator-facing entry point to PaymentsPermissionSeeder's
 * idempotent upsert — mirrors every other module's own sync-permissions
 * command.
 */
final class SyncPermissionsCommand extends Command
{
    protected $signature = 'payments:sync-permissions';

    protected $description = "Sync Payments' code-defined permission registry into the database.";

    public function handle(): int
    {
        (new PaymentsPermissionSeeder)->run();

        $this->info('Permissions synced.');

        return self::SUCCESS;
    }
}
