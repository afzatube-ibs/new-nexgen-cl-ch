<?php

declare(strict_types=1);

namespace App\Domains\Platform\Media\Console\Commands;

use Database\Seeders\MediaPermissionSeeder;
use Illuminate\Console\Command;

final class SyncPermissionsCommand extends Command
{
    protected $signature = 'media:sync-permissions';

    protected $description = "Sync Media's code-defined permission registry into the database.";

    public function handle(): int
    {
        (new MediaPermissionSeeder)->run();

        $this->info('Permissions synced.');

        return self::SUCCESS;
    }
}
