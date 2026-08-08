<?php

declare(strict_types=1);

/**
 * See QueryCountTest's own docblock for this suite's overall scope and
 * honest limitations. This file adds one more coarse signal a query-count
 * ceiling alone cannot catch: a genuinely pathological regression (an
 * accidental O(n²) loop, a synchronous network call newly introduced into
 * a request path that should never make one — see `PERFORMANCE_REVIEW.md`
 * §2's own "no transaction ever spans an external network call" finding).
 *
 * The threshold below is deliberately generous (seconds, not
 * milliseconds) — this environment (a shared, unmetered CI/sandbox
 * runner) has no performance isolation guarantee, so a tight millisecond
 * budget would be a source of flaky failures unrelated to the code being
 * tested, not a meaningful signal. This test exists to catch "this
 * request now takes 30 seconds instead of well under one," not to
 * benchmark microsecond-level regressions — that requires a dedicated
 * load-testing tool against a real, isolated environment, which is
 * explicitly out of this session's scope (no such tool or environment
 * exists here) and is named as a remaining recommendation in
 * `PHASE_1_1_COMPLETION_REPORT.md` rather than attempted here.
 */

use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Search\Actions\IndexProductAction;

it('responds to an order list request well within a generous bound', function () {
    Order::factory()->count(20)->create();
    $caller = userWithPermissions(['orders.orders.view']);

    $start = microtime(true);
    $this->actingAs($caller, 'sanctum')->getJson('/api/v1/orders')->assertOk();
    $elapsed = microtime(true) - $start;

    expect($elapsed)->toBeLessThan(3.0);
});

it('responds to a product search request well within a generous bound', function () {
    Product::factory()->active()->count(20)->create(['visibility' => Product::VISIBILITY_CATALOG_SEARCH])
        ->each(fn (Product $product) => app(IndexProductAction::class)->execute($product));
    $caller = userWithPermissions(['search.products.view']);

    $start = microtime(true);
    $this->actingAs($caller, 'sanctum')->getJson('/api/v1/search/products?q=product')->assertOk();
    $elapsed = microtime(true) - $start;

    expect($elapsed)->toBeLessThan(3.0);
});
