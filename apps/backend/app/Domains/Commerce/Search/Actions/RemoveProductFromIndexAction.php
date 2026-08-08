<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Actions;

use App\Domains\Commerce\Search\Engines\SearchEngineResolver;

/**
 * This module's only removal path — used by Listeners\
 * RemoveProductFromIndexOnProductArchived and available to
 * Actions\RebuildSearchIndexAction's own callers for an explicit,
 * standalone removal outside a full rebuild.
 */
final readonly class RemoveProductFromIndexAction
{
    public function __construct(private SearchEngineResolver $searchEngineResolver) {}

    public function execute(string $productId): void
    {
        $this->searchEngineResolver->resolveDefault()->remove($productId);
    }
}
