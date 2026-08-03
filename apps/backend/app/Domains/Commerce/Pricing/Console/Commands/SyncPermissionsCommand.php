<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Console\Commands;

use Database\Seeders\PricingPermissionSeeder;
use Illuminate\Console\Command;

/**
 * The operator-facing entry point to PricingPermissionSeeder's idempotent
 * upsert — mirrors every other module's own sync-permissions command.
 */
final class SyncPermissionsCommand extends Command
{
    protected $signature = 'pricing:sync-permissions';

    protected $description = "Sync Pricing's code-defined permission registry into the database.";

    public function handle(): int
    {
        (new PricingPermissionSeeder)->run();

        $this->info('Permissions synced.');

        return self::SUCCESS;
    }
}
