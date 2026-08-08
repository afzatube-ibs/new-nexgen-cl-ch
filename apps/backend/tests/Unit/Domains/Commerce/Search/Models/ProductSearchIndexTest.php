<?php

declare(strict_types=1);

use App\Domains\Commerce\Search\Models\ProductSearchIndex;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('defaults tenant_id on creation', function () {
    $entry = ProductSearchIndex::factory()->create();

    expect($entry->tenant_id)->toBe('default');
});

it('casts published_at to a Carbon instance', function () {
    $entry = ProductSearchIndex::factory()->create(['published_at' => '2026-01-01 00:00:00']);

    expect($entry->published_at)->toBeInstanceOf(Carbon::class);
});

it('enforces uniqueness on (tenant_id, product_id)', function () {
    $entry = ProductSearchIndex::factory()->create();

    expect(fn () => ProductSearchIndex::factory()->create(['product_id' => $entry->product_id]))
        ->toThrow(QueryException::class);
});
