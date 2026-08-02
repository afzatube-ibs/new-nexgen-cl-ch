<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Console\Commands;

use Database\Seeders\InventoryPermissionSeeder;
use Illuminate\Console\Command;

final class SyncPermissionsCommand extends Command
{
    protected $signature = 'inventory:sync-permissions';

    protected $description = "Sync Inventory's code-defined permission registry into the database.";

    public function handle(): int
    {
        (new InventoryPermissionSeeder)->run();

        $this->info('Permissions synced.');

        return self::SUCCESS;
    }
}
