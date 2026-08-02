<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Console\Commands;

use Database\Seeders\CatalogPermissionSeeder;
use Illuminate\Console\Command;

/**
 * The operator-facing entry point to CatalogPermissionSeeder's idempotent
 * upsert — mirrors Identity & Access's and Store Configuration's own
 * sync-permissions commands.
 */
final class SyncPermissionsCommand extends Command
{
    protected $signature = 'catalog:sync-permissions';

    protected $description = "Sync Catalog's code-defined permission registry into the database.";

    public function handle(): int
    {
        (new CatalogPermissionSeeder)->run();

        $this->info('Permissions synced.');

        return self::SUCCESS;
    }
}
