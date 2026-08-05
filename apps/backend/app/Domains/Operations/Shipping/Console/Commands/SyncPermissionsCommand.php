<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Console\Commands;

use Database\Seeders\ShippingPermissionSeeder;
use Illuminate\Console\Command;

/**
 * The operator-facing entry point to ShippingPermissionSeeder's idempotent
 * upsert — mirrors every other module's own sync-permissions command.
 */
final class SyncPermissionsCommand extends Command
{
    protected $signature = 'shipping:sync-permissions';

    protected $description = "Sync Shipping's code-defined permission registry into the database.";

    public function handle(): int
    {
        (new ShippingPermissionSeeder)->run();

        $this->info('Permissions synced.');

        return self::SUCCESS;
    }
}
