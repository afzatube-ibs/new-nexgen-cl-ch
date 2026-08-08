<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Listeners;

use App\Domains\Commerce\Catalog\Events\ProductCreated;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Search\Actions\IndexProductAction;
use Throwable;

/**
 * Search's own event-consumption surface, living inside this module's
 * own namespace rather than the neutral `app/Listeners/` bridge every
 * cross-DOMAIN listener (Fulfillment↔Orders, Returns↔Payments,
 * Notifications↔{Orders,Payments,Fulfillment,Returns,Customers}) uses —
 * Catalog and Search are both Commerce, so deptrac.yaml's domain-level
 * layers never flag this class's own `App\Domains\Commerce\Catalog\*`
 * imports, per `MODULE:INTERACTION_RULES` §10's same-domain direct-call
 * permission. Registered from Providers\SearchServiceProvider::boot(),
 * not App\Providers\AppServiceProvider — see this module's own v1.5
 * Change Log entry in docs/04_MODULE_ARCHITECTURE.md for the full
 * rationale behind this being new, deliberate precedent.
 *
 * Events\ProductCreated only carries `productId`/`sku`/`status` (per
 * SECURITY:EVENT_SECURITY — Catalog exposes only what a generic
 * subscriber needs), so this listener re-reads the full Product from
 * Catalog's own table to build the denormalized index entry — a
 * same-domain direct Eloquent read, not a cross-domain violation.
 *
 * The try/catch here is load-bearing, not defensive boilerplate,
 * following the exact lesson Notifications' own self-review
 * established (see App\Listeners\SendOrderConfirmationOnOrderPlaced's
 * docblock): Events\ProductCreated is published synchronously from
 * inside Catalog's own Actions\CreateProductAction transaction, so an
 * uncaught exception here would fail product creation itself over a
 * best-effort search-index refresh.
 */
final readonly class ReindexProductOnProductCreated
{
    public function __construct(private IndexProductAction $indexProductAction) {}

    public function handle(ProductCreated $event): void
    {
        try {
            $product = Product::query()->find($event->productId);

            if ($product === null) {
                return;
            }

            $this->indexProductAction->execute($product);
        } catch (Throwable $e) {
            report($e);
        }
    }
}
