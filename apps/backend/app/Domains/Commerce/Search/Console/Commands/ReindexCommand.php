<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Console\Commands;

use App\Domains\Commerce\Search\Actions\RebuildSearchIndexAction;
use Illuminate\Console\Command;

/**
 * The operator-facing path to Actions\RebuildSearchIndexAction — the
 * same rebuild HTTP\Controllers\SearchController::reindex() triggers,
 * available here for a deployment/ops script (e.g. after a bulk Catalog
 * import) without needing an authenticated HTTP request.
 */
final class ReindexCommand extends Command
{
    protected $signature = 'search:reindex';

    protected $description = "Rebuild Search's entire product index from Catalog's current data.";

    public function __construct(private readonly RebuildSearchIndexAction $rebuildSearchIndexAction)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $indexed = $this->rebuildSearchIndexAction->execute();

        $this->info("Reindexed {$indexed} product(s).");

        return self::SUCCESS;
    }
}
