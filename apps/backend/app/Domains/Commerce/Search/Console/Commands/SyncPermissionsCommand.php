<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Console\Commands;

use Database\Seeders\SearchPermissionSeeder;
use Illuminate\Console\Command;

final class SyncPermissionsCommand extends Command
{
    protected $signature = 'search:sync-permissions';

    protected $description = "Sync Search's code-defined permission registry into the database.";

    public function handle(): int
    {
        (new SearchPermissionSeeder)->run();

        $this->info('Permissions synced.');

        return self::SUCCESS;
    }
}
