<?php

declare(strict_types=1);

use App\Domains\Commerce\Checkout\Support\ShippingOptionCatalog;

it('lists every shipping option with a unique id', function () {
    $ids = array_map(fn ($option) => $option->id, ShippingOptionCatalog::all());

    expect($ids)->toBe(array_unique($ids));
    expect($ids)->not->toBeEmpty();
});

it('finds a known shipping option by id', function () {
    $option = ShippingOptionCatalog::find('standard');

    expect($option)->not->toBeNull();
    expect($option->id)->toBe('standard');
});

it('returns null for an unknown shipping option id', function () {
    expect(ShippingOptionCatalog::find('does-not-exist'))->toBeNull();
});
