<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Engines\Support;

use Illuminate\Support\Carbon;

/**
 * The engine-agnostic shape every Engines\Contracts\SearchEngineContract::
 * index() call receives — mirrors Notifications' Channels\Support\
 * NotificationSendRequest exactly: a concrete engine never sees
 * Models\ProductSearchIndex or Catalog's own Product model, only these
 * plain, already-denormalized values built by Actions\IndexProductAction.
 */
final readonly class SearchIndexEntry
{
    public function __construct(
        public string $productId,
        public string $sku,
        public string $name,
        public string $searchableText,
        public string $status,
        public string $visibility,
        public ?string $brandId,
        public ?Carbon $publishedAt,
    ) {}
}
