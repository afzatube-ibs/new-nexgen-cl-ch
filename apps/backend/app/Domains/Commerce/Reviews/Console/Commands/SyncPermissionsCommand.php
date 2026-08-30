<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Console\Commands;

use Database\Seeders\ReviewsPermissionSeeder;
use Illuminate\Console\Command;

final class SyncPermissionsCommand extends Command
{
    protected $signature = 'reviews:sync-permissions';

    protected $description = "Sync Reviews' code-defined permission registry into the database.";

    public function handle(): int
    {
        (new ReviewsPermissionSeeder)->run();

        $this->info('Permissions synced.');

        return self::SUCCESS;
    }
}
