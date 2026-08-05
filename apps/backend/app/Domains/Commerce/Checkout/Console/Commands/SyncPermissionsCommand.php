<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Console\Commands;

use Database\Seeders\CheckoutPermissionSeeder;
use Illuminate\Console\Command;

/**
 * The operator-facing entry point to CheckoutPermissionSeeder's
 * idempotent upsert — mirrors every other module's own sync-permissions
 * command.
 */
final class SyncPermissionsCommand extends Command
{
    protected $signature = 'checkout:sync-permissions';

    protected $description = "Sync Checkout's code-defined permission registry into the database.";

    public function handle(): int
    {
        (new CheckoutPermissionSeeder)->run();

        $this->info('Permissions synced.');

        return self::SUCCESS;
    }
}
