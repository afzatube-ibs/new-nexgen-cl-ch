<?php

declare(strict_types=1);

namespace App\Domains\Platform\Appearance\Console\Commands;

use Database\Seeders\AppearancePermissionSeeder;
use Illuminate\Console\Command;

final class SyncPermissionsCommand extends Command
{
    protected $signature = 'appearance:sync-permissions';

    protected $description = "Sync Appearance's code-defined permission registry into the database.";

    public function handle(): int
    {
        (new AppearancePermissionSeeder)->run();

        $this->info('Permissions synced.');

        return self::SUCCESS;
    }
}
