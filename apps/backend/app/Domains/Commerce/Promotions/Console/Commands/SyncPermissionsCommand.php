<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Console\Commands;

use Database\Seeders\PromotionsPermissionSeeder;
use Illuminate\Console\Command;

/**
 * The operator-facing entry point to PromotionsPermissionSeeder's
 * idempotent upsert — mirrors every other module's own sync-permissions
 * command.
 */
final class SyncPermissionsCommand extends Command
{
    protected $signature = 'promotions:sync-permissions';

    protected $description = "Sync Promotions' code-defined permission registry into the database.";

    public function handle(): int
    {
        (new PromotionsPermissionSeeder)->run();

        $this->info('Permissions synced.');

        return self::SUCCESS;
    }
}
