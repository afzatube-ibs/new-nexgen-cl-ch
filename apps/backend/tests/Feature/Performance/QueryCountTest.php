<?php

declare(strict_types=1);

/**
 * Phase 1.1 Production Hardening (`PERFORMANCE_REVIEW.md` P-2,
 * `TECHNICAL_DEBT_REPORT.md` TD-5, `ARCHITECTURE_REVIEW_PHASE1.md` B-25):
 * this platform had no performance test anywhere — every performance claim
 * in every prior review was a structural/code-reading judgment, never a
 * measured one. This is a deliberately modest first step, not a full load
 * or throughput test suite (that requires a dedicated tool and a real
 * staging environment neither of which this session's sandbox has) — it
 * measures the one performance property most reviews actually care about
 * and code review alone cannot reliably catch: **N+1 queries on a list or
 * show endpoint that returns a collection of related records**, asserted
 * as a fixed, small query-count ceiling per endpoint rather than eyeballed.
 *
 * A ceiling here is intentionally generous (a handful of queries above the
 * observed baseline) — the goal is catching a *regression* that reintroduces
 * an N+1 (a future change that accidentally lazy-loads a relation inside a
 * loop, multiplying query count with result-set size), not pinning the
 * exact query plan. Each assertion's own comment states what a regression
 * would look like and why the ceiling is set where it is.
 */

use App\Domains\Commerce\Catalog\Models\Brand;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Search\Actions\IndexProductAction;
use Illuminate\Support\Facades\DB;

function countQueriesDuring(Closure $callback): int
{
    $count = 0;
    DB::listen(function () use (&$count): void {
        $count++;
    });

    $callback();

    return $count;
}

it('does not N+1 when listing orders with multiple rows', function () {
    Order::factory()->count(10)->create();
    $caller = userWithPermissions(['orders.orders.view']);

    $queries = countQueriesDuring(function () use ($caller): void {
        $this->actingAs($caller, 'sanctum')->getJson('/api/v1/orders')->assertOk();
    });

    // A flat, unrelated-collection list endpoint (Orders' own index() does
    // not eager-load child relations — see that controller's own
    // docblock for why) should query in a small, fixed number of
    // statements regardless of row count: one for the paginated SELECT,
    // one for the COUNT, plus a small constant for auth/permission
    // resolution — never one additional query per Order returned. A
    // regression that reintroduces a per-row lazy load would make this
    // scale with the 10 rows seeded above, not stay flat.
    expect($queries)->toBeLessThanOrEqual(15);
});

it('does not N+1 when showing a single order with its eager-loaded relations', function () {
    $order = Order::factory()->create();
    $caller = userWithPermissions(['orders.orders.view']);

    $queries = countQueriesDuring(function () use ($caller, $order): void {
        $this->actingAs($caller, 'sanctum')->getJson("/api/v1/orders/{$order->id}")->assertOk();
    });

    // OrderController::show() eager-loads five relations
    // (items/addresses/discounts/notes/timelineEvents) in one ->load()
    // call — one query per relation plus the base fetch and auth
    // overhead, never N queries per related row within any one relation.
    expect($queries)->toBeLessThanOrEqual(12);
});

it('does not N+1 when searching products with multiple results', function () {
    Brand::factory()->count(3)->create();
    Product::factory()->active()->count(15)->create(['visibility' => Product::VISIBILITY_CATALOG_SEARCH])
        ->each(fn (Product $product) => app(IndexProductAction::class)->execute($product));
    $caller = userWithPermissions(['search.products.view']);

    $queries = countQueriesDuring(function () use ($caller): void {
        $this->actingAs($caller, 'sanctum')->getJson('/api/v1/search/products')->assertOk();
    });

    // Engines\MySqlFullTextSearchEngine::search() runs exactly one COUNT
    // and one paginated SELECT against the already-denormalized
    // product_search_index table — per DATA:SEARCH_INDEXING's whole
    // point, a search result never needs to join back to Catalog at
    // query time, so this must stay flat regardless of result count.
    expect($queries)->toBeLessThanOrEqual(15);
});
