<?php

declare(strict_types=1);

use App\Domains\Platform\Localization\Http\Rules\IsValidCurrencyCode;

it('accepts a real, currently-circulating ISO 4217 code', function () {
    $rule = new IsValidCurrencyCode;
    $failed = false;

    $rule->validate('code', 'USD', function () use (&$failed) {
        $failed = true;
    });

    expect($failed)->toBeFalse();
});

it('accepts a lowercase code that maps to a valid currency', function () {
    $rule = new IsValidCurrencyCode;
    $failed = false;

    $rule->validate('code', 'usd', function () use (&$failed) {
        $failed = true;
    });

    expect($failed)->toBeFalse();
});

it('rejects a well-formed but non-existent currency code', function () {
    $rule = new IsValidCurrencyCode;
    $failed = false;

    $rule->validate('code', 'ZZZ', function () use (&$failed) {
        $failed = true;
    });

    expect($failed)->toBeTrue();
});

it('rejects a non-string value', function () {
    $rule = new IsValidCurrencyCode;
    $failed = false;

    $rule->validate('code', 123, function () use (&$failed) {
        $failed = true;
    });

    expect($failed)->toBeTrue();
});
