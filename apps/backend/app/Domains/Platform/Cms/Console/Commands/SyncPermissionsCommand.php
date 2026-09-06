<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Console\Commands;

use Database\Seeders\CmsPermissionSeeder;
use Illuminate\Console\Command;

final class SyncPermissionsCommand extends Command
{
    protected $signature = 'cms:sync-permissions';
    protected $description = "Sync CMS's code-defined permission registry into the database.";

    public function handle(): int
    {
        (new CmsPermissionSeeder)->run();
        $this->info('Permissions synced.');
        return self::SUCCESS;
    }
}
