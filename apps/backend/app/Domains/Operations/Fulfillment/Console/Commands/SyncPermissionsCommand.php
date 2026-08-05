<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Console\Commands;

use Database\Seeders\FulfillmentPermissionSeeder;
use Illuminate\Console\Command;

/**
 * The operator-facing entry point to FulfillmentPermissionSeeder's
 * idempotent upsert — mirrors every other module's own sync-permissions
 * command.
 */
final class SyncPermissionsCommand extends Command
{
    protected $signature = 'fulfillment:sync-permissions';

    protected $description = "Sync Fulfillment's code-defined permission registry into the database.";

    public function handle(): int
    {
        (new FulfillmentPermissionSeeder)->run();

        $this->info('Permissions synced.');

        return self::SUCCESS;
    }
}
