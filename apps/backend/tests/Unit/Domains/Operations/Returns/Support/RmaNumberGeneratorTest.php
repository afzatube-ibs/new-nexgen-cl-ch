<?php

declare(strict_types=1);

use App\Domains\Operations\Returns\Models\ReturnRequest;
use App\Domains\Operations\Returns\Support\RmaNumberGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('generates an RMA number in the RMA-###### format', function () {
    $rma = app(RmaNumberGenerator::class)->generate();

    expect($rma)->toMatch('/^RMA-\d{6}$/');
});

it('never returns a value that already exists', function () {
    $existing = ReturnRequest::factory()->create()->rma_number;

    $generated = [];
    for ($i = 0; $i < 25; $i++) {
        $generated[] = app(RmaNumberGenerator::class)->generate();
    }

    expect($generated)->not->toContain($existing);
    expect($generated)->toBe(array_unique($generated));
});
