<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Console\Commands;

use Database\Seeders\CustomersPermissionSeeder;
use Illuminate\Console\Command;

/**
 * The operator-facing entry point to CustomersPermissionSeeder's
 * idempotent upsert — mirrors every other module's own sync-permissions
 * command.
 */
final class SyncPermissionsCommand extends Command
{
    protected $signature = 'customers:sync-permissions';

    protected $description = "Sync Customers' code-defined permission registry into the database.";

    public function handle(): int
    {
        (new CustomersPermissionSeeder)->run();

        $this->info('Permissions synced.');

        return self::SUCCESS;
    }
}
