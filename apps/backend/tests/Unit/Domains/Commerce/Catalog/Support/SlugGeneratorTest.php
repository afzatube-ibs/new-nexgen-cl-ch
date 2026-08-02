<?php

declare(strict_types=1);

use App\Domains\Commerce\Catalog\Models\Brand;
use App\Domains\Commerce\Catalog\Support\SlugGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('slugifies the source string', function () {
    expect(SlugGenerator::unique('Hello World', Brand::query()))->toBe('hello-world');
});

it('appends a numeric suffix on collision', function () {
    Brand::factory()->create(['slug' => 'acme']);

    expect(SlugGenerator::unique('Acme', Brand::query()))->toBe('acme-2');
});

it('keeps incrementing the suffix until it finds a free slug', function () {
    Brand::factory()->create(['slug' => 'acme']);
    Brand::factory()->create(['slug' => 'acme-2']);

    expect(SlugGenerator::unique('Acme', Brand::query()))->toBe('acme-3');
});
