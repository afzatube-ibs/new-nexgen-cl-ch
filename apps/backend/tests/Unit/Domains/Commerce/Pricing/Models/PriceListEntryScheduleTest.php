<?php

declare(strict_types=1);

use App\Domains\Commerce\Pricing\Models\PriceListEntry;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('is not on sale when no sale_price is set', function () {
    $entry = PriceListEntry::factory()->make(['base_price' => '100.00', 'sale_price' => null]);

    expect($entry->isSaleActive())->toBeFalse();
    expect($entry->effectivePrice())->toBe($entry->base_price);
});

it('is on sale when a sale_price is set with no schedule window', function () {
    $entry = PriceListEntry::factory()->make([
        'base_price' => '100.00',
        'sale_price' => '80.00',
        'sale_starts_at' => null,
        'sale_ends_at' => null,
    ]);

    expect($entry->isSaleActive())->toBeTrue();
    expect($entry->effectivePrice())->toBe('80.0000');
});

it('is not on sale before the sale_starts_at moment', function () {
    $entry = PriceListEntry::factory()->make([
        'base_price' => '100.00',
        'sale_price' => '80.00',
        'sale_starts_at' => CarbonImmutable::now()->addDay(),
        'sale_ends_at' => null,
    ]);

    expect($entry->isSaleActive())->toBeFalse();
    expect($entry->effectivePrice())->toBe('100.0000');
});

it('is on sale between sale_starts_at and sale_ends_at', function () {
    $entry = PriceListEntry::factory()->make([
        'base_price' => '100.00',
        'sale_price' => '80.00',
        'sale_starts_at' => CarbonImmutable::now()->subDay(),
        'sale_ends_at' => CarbonImmutable::now()->addDay(),
    ]);

    expect($entry->isSaleActive())->toBeTrue();
    expect($entry->effectivePrice())->toBe('80.0000');
});

it('is not on sale after the sale_ends_at moment', function () {
    $entry = PriceListEntry::factory()->make([
        'base_price' => '100.00',
        'sale_price' => '80.00',
        'sale_starts_at' => null,
        'sale_ends_at' => CarbonImmutable::now()->subDay(),
    ]);

    expect($entry->isSaleActive())->toBeFalse();
    expect($entry->effectivePrice())->toBe('100.0000');
});
