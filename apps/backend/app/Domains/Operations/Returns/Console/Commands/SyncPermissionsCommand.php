<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Console\Commands;

use Database\Seeders\ReturnsPermissionSeeder;
use Illuminate\Console\Command;

final class SyncPermissionsCommand extends Command
{
    protected $signature = 'returns:sync-permissions';

    protected $description = "Sync Returns' code-defined permission registry into the database.";

    public function handle(): int
    {
        (new ReturnsPermissionSeeder)->run();

        $this->info('Permissions synced.');

        return self::SUCCESS;
    }
}
