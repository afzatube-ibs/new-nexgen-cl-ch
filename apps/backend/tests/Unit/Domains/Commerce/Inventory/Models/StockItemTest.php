<?php

declare(strict_types=1);

use App\Domains\Commerce\Inventory\Models\StockItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('computes available as on-hand minus reserved', function () {
    $stockItem = StockItem::factory()->create(['quantity_on_hand' => 50, 'quantity_reserved' => 20]);

    expect($stockItem->available())->toBe(30);
});
