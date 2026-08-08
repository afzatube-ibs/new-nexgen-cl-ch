<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Search\Engines\MySqlFullTextSearchEngine;
use App\Domains\Commerce\Search\Engines\Support\SearchIndexEntry;
use App\Domains\Commerce\Search\Engines\Support\SearchQuery;
use App\Domains\Commerce\Search\Models\ProductSearchIndex;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Illuminate\Support\Str;
use Tests\TestCase;

// InnoDB FULLTEXT indexes only consider committed data (MySQL/MariaDB's
// own documented behavior: "a row does not appear in full-text search
// results until the transaction that inserted it is committed") — so
// RefreshDatabase's per-test open transaction, which every other test in
// this codebase relies on for isolation, would hide every row this test
// inserts from a real MATCH ... AGAINST query. DatabaseTruncation runs
// each test against real committed rows and truncates afterward instead,
// which is the only trait combination that can actually exercise
// Engines\MySqlFullTextSearchEngine's own FULLTEXT queries.
uses(TestCase::class, DatabaseTruncation::class);

// DatabaseTruncation only truncates BEFORE each test in a file that uses
// it (Illuminate\Foundation\Testing\Concerns\InteractsWithTestCaseLifecycle
// ::setUpTraits()), never after — so without this, the last test in this
// file to commit rows would leak them into every RefreshDatabase-isolated
// test that happens to run later in the same PHP process (RefreshDatabase
// only ever sees its own transaction, not what another file already
// committed). This afterEach is what actually keeps this file's real,
// committed rows from polluting the rest of the suite.
afterEach(function () {
    ProductSearchIndex::query()->delete();
});

function makeEntry(
    string $name,
    string $sku,
    string $status = Product::STATUS_ACTIVE,
    string $visibility = Product::VISIBILITY_CATALOG_SEARCH,
    ?string $brandId = null,
): SearchIndexEntry {
    return new SearchIndexEntry(
        productId: (string) Str::uuid(),
        sku: $sku,
        name: $name,
        searchableText: $name.' '.$sku,
        status: $status,
        visibility: $visibility,
        brandId: $brandId,
        publishedAt: now(),
    );
}

it('is always available', function () {
    expect((new MySqlFullTextSearchEngine)->isAvailable())->toBeTrue();
});

it('upserts an entry on index() and is idempotent for the same product_id', function () {
    $engine = new MySqlFullTextSearchEngine;
    $entry = makeEntry('Wireless Mouse', 'SKU-1');

    $engine->index($entry);
    $engine->index($entry);

    expect(ProductSearchIndex::query()->where('product_id', $entry->productId)->count())->toBe(1);
});

it('removes an entry by product_id', function () {
    $engine = new MySqlFullTextSearchEngine;
    $entry = makeEntry('Removable Item', 'SKU-2');
    $engine->index($entry);

    $engine->remove($entry->productId);

    expect(ProductSearchIndex::query()->where('product_id', $entry->productId)->exists())->toBeFalse();
});

it('matches a whole indexed word via boolean-mode relevance ranking', function () {
    $engine = new MySqlFullTextSearchEngine;
    $engine->index(makeEntry('Wireless Bluetooth Headphones', 'SKU-A'));
    $engine->index(makeEntry('Wired Earphones', 'SKU-B'));

    $result = $engine->search(new SearchQuery(
        term: 'wireless',
        status: [Product::STATUS_ACTIVE],
        visibility: [Product::VISIBILITY_CATALOG_SEARCH],
        brandId: null,
    ));

    expect($result->total)->toBe(1);
    expect($result->items->first()->name)->toBe('Wireless Bluetooth Headphones');
});

it('matches a partial/prefix word via boolean-mode wildcarding', function () {
    $engine = new MySqlFullTextSearchEngine;
    $engine->index(makeEntry('Wireless Bluetooth Headphones', 'SKU-C'));
    $engine->index(makeEntry('Wired Earphones', 'SKU-D'));

    $result = $engine->search(new SearchQuery(
        term: 'wire',
        status: [Product::STATUS_ACTIVE],
        visibility: [Product::VISIBILITY_CATALOG_SEARCH],
        brandId: null,
    ));

    expect($result->total)->toBe(2);
});

it('falls back to a LIKE scan for a term shorter than the fulltext minimum word length', function () {
    $engine = new MySqlFullTextSearchEngine;
    $engine->index(makeEntry('TP Combo Kit', 'TP-1'));

    $result = $engine->search(new SearchQuery(
        term: 'tp',
        status: [Product::STATUS_ACTIVE],
        visibility: [Product::VISIBILITY_CATALOG_SEARCH],
        brandId: null,
    ));

    expect($result->total)->toBe(1);
});

it('browses without a term, applying only filters and sort', function () {
    $engine = new MySqlFullTextSearchEngine;
    $engine->index(makeEntry('Alpha Product', 'ALPHA-1'));
    $engine->index(makeEntry('Beta Product', 'BETA-1'));

    $result = $engine->search(new SearchQuery(
        term: null,
        status: [Product::STATUS_ACTIVE],
        visibility: [Product::VISIBILITY_CATALOG_SEARCH],
        brandId: null,
        sort: 'name',
        direction: 'asc',
    ));

    expect($result->total)->toBe(2);
    expect($result->items->pluck('name')->all())->toBe(['Alpha Product', 'Beta Product']);
});

it('filters by status and visibility', function () {
    $engine = new MySqlFullTextSearchEngine;
    $engine->index(makeEntry('Active Item', 'ACT-1', status: Product::STATUS_ACTIVE));
    $engine->index(makeEntry('Draft Item', 'DRF-1', status: Product::STATUS_DRAFT));

    $result = $engine->search(new SearchQuery(
        term: null,
        status: [Product::STATUS_ACTIVE],
        visibility: [Product::VISIBILITY_CATALOG_SEARCH],
        brandId: null,
    ));

    expect($result->total)->toBe(1);
    expect($result->items->first()->name)->toBe('Active Item');
});

it('filters by brand_id', function () {
    $engine = new MySqlFullTextSearchEngine;
    $brandId = (string) Str::uuid();
    $engine->index(makeEntry('Branded Item', 'BR-1', brandId: $brandId));
    $engine->index(makeEntry('Unbranded Item', 'UB-1'));

    $result = $engine->search(new SearchQuery(
        term: null,
        status: [Product::STATUS_ACTIVE],
        visibility: [Product::VISIBILITY_CATALOG_SEARCH],
        brandId: $brandId,
    ));

    expect($result->total)->toBe(1);
    expect($result->items->first()->name)->toBe('Branded Item');
});

it('paginates results', function () {
    $engine = new MySqlFullTextSearchEngine;
    foreach (range(1, 5) as $i) {
        $engine->index(makeEntry("Item {$i}", "PG-{$i}"));
    }

    $result = $engine->search(new SearchQuery(
        term: null,
        status: [Product::STATUS_ACTIVE],
        visibility: [Product::VISIBILITY_CATALOG_SEARCH],
        brandId: null,
        sort: 'name',
        page: 2,
        perPage: 2,
    ));

    expect($result->total)->toBe(5);
    expect($result->items)->toHaveCount(2);
    expect($result->page)->toBe(2);
    expect($result->lastPage())->toBe(3);
});
