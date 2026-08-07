<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Console\Commands;

use Database\Seeders\NotificationsPermissionSeeder;
use Illuminate\Console\Command;

final class SyncPermissionsCommand extends Command
{
    protected $signature = 'notifications:sync-permissions';

    protected $description = "Sync Notifications' code-defined permission registry into the database.";

    public function handle(): int
    {
        (new NotificationsPermissionSeeder)->run();

        $this->info('Permissions synced.');

        return self::SUCCESS;
    }
}
