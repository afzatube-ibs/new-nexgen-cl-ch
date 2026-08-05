<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Console\Commands;

use Database\Seeders\OrdersPermissionSeeder;
use Illuminate\Console\Command;

/**
 * The operator-facing entry point to OrdersPermissionSeeder's idempotent
 * upsert — mirrors every other module's own sync-permissions command.
 */
final class SyncPermissionsCommand extends Command
{
    protected $signature = 'orders:sync-permissions';

    protected $description = "Sync Orders' code-defined permission registry into the database.";

    public function handle(): int
    {
        (new OrdersPermissionSeeder)->run();

        $this->info('Permissions synced.');

        return self::SUCCESS;
    }
}
