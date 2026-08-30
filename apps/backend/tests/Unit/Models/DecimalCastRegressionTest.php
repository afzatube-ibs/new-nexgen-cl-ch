<?php

declare(strict_types=1);

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Orders\Models\OrderDiscount;
use App\Domains\Commerce\Orders\Models\OrderItem;
use App\Domains\Commerce\Promotions\Models\PromotionRedemption;
use App\Domains\Platform\Localization\Models\Currency;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Milestone 8's own dashboard revenue widgets need `Order`/`OrderItem`'s
 * own money columns to be real decimal strings, not whatever PHP type
 * SQLite's NUMERIC column affinity happens to hand back — the same
 * "missing `decimal:N` cast" bug class already found and fixed five times
 * earlier this engagement (`PriceListEntry`/`TaxRate`, `CheckoutSession`/
 * `CheckoutItem`, `RefundRequest`), and found a sixth time here, on the
 * platform's own most central financial model, while building those
 * widgets. A whole-number amount is the specific reproduction case: SQLite
 * stores a NUMERIC-affinity column holding a value with no fractional part
 * as an `INTEGER` internally, so an uncast Eloquent attribute round-trips
 * as a PHP `int`, not the `string` every real caller (JSON serialization,
 * `bcmath`, strictly-typed Action parameters) requires. MySQL/PostgreSQL's
 * own PDO drivers already return `DECIMAL` columns as strings regardless
 * of the Eloquent cast, which is why these went unnoticed by the
 * MySQL-backed test suite until exercised against this installation's real
 * SQLite dev database.
 */
uses(TestCase::class, RefreshDatabase::class);

it('returns a whole-number Order total as a decimal string, not an int, once re-fetched', function () {
    $order = Order::factory()->create(['grand_total' => '2550.0000', 'subtotal' => '2550.0000']);

    $fresh = $order->fresh();

    expect($fresh->grand_total)->toBeString()->toBe('2550.0000');
    expect($fresh->subtotal)->toBeString()->toBe('2550.0000');
});

it('returns a whole-number OrderItem unit_price as a decimal string, not an int, once re-fetched', function () {
    $order = Order::factory()->create();
    $item = OrderItem::factory()->create(['order_id' => $order->id, 'unit_price' => '50.0000', 'line_subtotal' => '50.0000']);

    $fresh = $item->fresh();

    expect($fresh->unit_price)->toBeString()->toBe('50.0000');
    expect($fresh->line_subtotal)->toBeString()->toBe('50.0000');
});

it('returns a whole-number OrderDiscount amount as a decimal string, not an int, once re-fetched', function () {
    $order = Order::factory()->create();
    $discount = OrderDiscount::factory()->create(['order_id' => $order->id, 'amount' => '10.0000']);

    expect($discount->fresh()->amount)->toBeString()->toBe('10.0000');
});

it('returns a whole-number Currency exchange_rate as a decimal string, not an int, once re-fetched', function () {
    $currency = Currency::factory()->create(['exchange_rate' => '1.000000']);

    expect($currency->fresh()->exchange_rate)->toBeString()->toBe('1.000000');
});

it('returns a whole-number PromotionRedemption discount_amount as a decimal string, not an int, once re-fetched', function () {
    $redemption = PromotionRedemption::factory()->create(['discount_amount' => '25.0000']);

    expect($redemption->fresh()->discount_amount)->toBeString()->toBe('25.0000');
});
